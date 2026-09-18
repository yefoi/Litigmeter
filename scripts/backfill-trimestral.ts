import path from "node:path";
import { PDFParse } from "pdf-parse";
import { escribirIndicadores, leerIndicadores } from "../lib/indicadores/ficheros";
import { informeDesdeIndicadores } from "../lib/indicadores/informe";
import { documentosDeInforme } from "../lib/indicadores/pagina";
import { parsearIndicadoresPdf } from "../lib/indicadores/parser";
import type { FicheroIndicadores, TasasIndicadores } from "../lib/indicadores/tipos";
import { normalizarComunidad } from "../lib/litigiosidad/ccaa";
import { escribirInforme, leerInforme } from "../lib/litigiosidad/historico";

const URL_BASE =
  "https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Indicadores-Clave/Indicadores-clave-del-conjunto-de-las-jurisdicciones----";
const ORDINALES = ["Primer", "Segundo", "Tercer", "Cuarto"];
const USER_AGENT = "litigmeter/0.1 (backfill de indicadores trimestrales)";
const PAUSA_MS = 150;

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

function pausa(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function descargar(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
}

async function tasasDePdf(url: string): Promise<TasasIndicadores> {
  const respuesta = await descargar(url);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${url}`);
  const parser = new PDFParse({ data: Buffer.from(await respuesta.arrayBuffer()) });
  try {
    const texto = await parser.getText();
    return parsearIndicadoresPdf(texto.pages[0]?.text ?? "");
  } finally {
    await parser.destroy();
  }
}

async function backfillTrimestre(
  dataBase: string,
  dataDir: string,
  anio: number,
  trimestre: number,
  force: boolean,
): Promise<"omitido" | "sin_pagina" | "ok"> {
  const clave = `${anio}-T${trimestre}`;
  const existente = await leerIndicadores(dataBase, anio, trimestre);
  if (existente && !force) {
    if (!(await leerInforme(dataDir, anio, trimestre))) {
      await escribirInforme(dataDir, informeDesdeIndicadores(existente));
    }
    return "omitido";
  }

  const url = `${URL_BASE}${ORDINALES[trimestre - 1]}-Trimestre-${anio}`;
  const respuesta = await descargar(url);
  if (!respuesta.ok) return "sin_pagina";
  const documentos = documentosDeInforme(await respuesta.text());
  if (documentos.length === 0) return "sin_pagina";

  const comunidades: Record<string, TasasIndicadores> = {};
  let nacional: TasasIndicadores | undefined;
  let fallos = 0;

  for (const documento of documentos) {
    const comunidad = documento.esNacional
      ? undefined
      : normalizarComunidad(documento.entidad);
    if (!documento.esNacional && !comunidad) continue;
    try {
      const tasas = await tasasDePdf(documento.url);
      if (documento.esNacional) nacional = tasas;
      else if (comunidad) comunidades[comunidad] = tasas;
    } catch {
      fallos++;
    }
    await pausa(PAUSA_MS);
  }

  if (Object.keys(comunidades).length === 0) return "sin_pagina";

  const fichero: FicheroIndicadores = {
    version_esquema: 1,
    anio,
    trimestre,
    fuente: { url, titulo: `Indicadores clave ${clave} (CGPJ)` },
    nacional,
    comunidades,
  };
  await escribirIndicadores(dataBase, fichero);
  if (!(await leerInforme(dataDir, anio, trimestre))) {
    await escribirInforme(dataDir, informeDesdeIndicadores(fichero));
  }

  console.log(
    `  ${clave}: ${Object.keys(comunidades).length} CCAA${nacional ? " + nacional" : ""}` +
      `${fallos > 0 ? `, ${fallos} fallos` : ""}`,
  );
  return "ok";
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const dataDir = path.join(dataBase, "litigiosidad");
  const force = process.argv.includes("--force");
  const desde = Number(opcion("desde") ?? 2017);
  const hasta = Number(opcion("hasta") ?? new Date().getFullYear());

  let creados = 0;
  let omitidos = 0;
  let sinPagina = 0;

  for (let anio = desde; anio <= hasta; anio++) {
    for (let trimestre = 1; trimestre <= 4; trimestre++) {
      const resultado = await backfillTrimestre(dataBase, dataDir, anio, trimestre, force);
      if (resultado === "ok") creados++;
      else if (resultado === "omitido") omitidos++;
      else sinPagina++;
      await pausa(PAUSA_MS);
    }
  }

  console.log(
    `Backfill terminado: ${creados} trimestres creados, ${omitidos} ya existentes, ` +
      `${sinPagina} sin página disponible.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
