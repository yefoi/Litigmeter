import * as cheerio from "cheerio";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { escribirIndicadores, leerIndicadores } from "../lib/indicadores/ficheros";
import { documentosDeInforme, periodoDeTitulo } from "../lib/indicadores/pagina";
import { parsearIndicadoresPdf } from "../lib/indicadores/parser";
import type { FicheroIndicadores, TasasIndicadores } from "../lib/indicadores/tipos";
import { normalizarComunidad } from "../lib/litigiosidad/ccaa";

const BASE = "https://www.poderjudicial.es";
const FEED_ESTUDIOS = `${BASE}/cgpj/es/Temas/Estadistica-Judicial/ch.Estudios-e-Informes.formato1/`;
const USER_AGENT = "litigmeter/0.1 (indicadores clave del CGPJ)";
const PAUSA_MS = 350;

interface InformeDetectado {
  url: string;
  titulo: string;
  anio: number;
  trimestre: number;
}

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function descargar(url: string): Promise<Response> {
  const respuesta = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al descargar ${url}`);
  return respuesta;
}

function periodoDeTituloLocal(titulo: string): { anio: number; trimestre: number } | undefined {
  return periodoDeTitulo(titulo);
}

async function descubrirInforme(): Promise<InformeDetectado | undefined> {
  const xml = await (await descargar(FEED_ESTUDIOS)).text();
  const $ = cheerio.load(xml, { xmlMode: true });
  let encontrado: InformeDetectado | undefined;
  $("item").each((_, el) => {
    if (encontrado) return;
    const titulo = $(el).find("title").text().replace(/\s+/g, " ").trim();
    if (!/indicadores clave/i.test(titulo)) return;
    const periodo = periodoDeTituloLocal(titulo);
    if (!periodo) return;
    encontrado = {
      url: $(el).find("link").text().trim().replace(/^http:/, "https:"),
      titulo,
      ...periodo,
    };
  });
  return encontrado;
}

async function tasasDePdf(url: string): Promise<TasasIndicadores> {
  const respuesta = await descargar(url);
  const buffer = Buffer.from(await respuesta.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  try {
    const texto = await parser.getText();
    const primeraPagina = texto.pages[0]?.text ?? "";
    return parsearIndicadoresPdf(primeraPagina);
  } finally {
    await parser.destroy();
  }
}

async function main(): Promise<void> {
  const baseDir = opcion("data") ?? path.join(process.cwd(), "data");
  const force = process.argv.includes("--force");
  const urlDirecta = opcion("url");

  let informe: InformeDetectado | undefined;
  if (urlDirecta) {
    const html = await (await descargar(urlDirecta)).text();
    const $ = cheerio.load(html);
    const titulo = $("h1").first().text().replace(/\s+/g, " ").trim() || $("title").text().trim();
    const periodo = periodoDeTituloLocal(titulo);
    if (!periodo) throw new Error(`No se pudo determinar el periodo en "${titulo}"`);
    informe = { url: urlDirecta, titulo, ...periodo };
  } else {
    informe = await descubrirInforme();
  }

  if (!informe) {
    console.log("Sin informe de Indicadores clave en el feed; nada que hacer.");
    return;
  }

  const { url, titulo, anio, trimestre } = informe;
  if (!force && (await leerIndicadores(baseDir, anio, trimestre))) {
    console.log(`Indicadores ${anio}-T${trimestre} ya guardados; nada que hacer.`);
    return;
  }

  const html = await (await descargar(url)).text();
  const documentos = documentosDeInforme(html);
  if (documentos.length === 0) {
    throw new Error(`El informe ${url} no contiene PDFs de indicadores`);
  }

  const comunidades: Record<string, TasasIndicadores> = {};
  let nacional: TasasIndicadores | undefined;
  let fallos = 0;

  for (const documento of documentos) {
    const esNacional = documento.esNacional;
    const comunidad = esNacional ? undefined : normalizarComunidad(documento.entidad);
    if (!esNacional && !comunidad) {
      console.warn(`  [aviso] entidad no reconocida: "${documento.entidad}"`);
      continue;
    }
    try {
      const tasas = await tasasDePdf(documento.url);
      if (esNacional) {
        nacional = tasas;
      } else if (comunidad) {
        comunidades[comunidad] = tasas;
      }
      const etiqueta = esNacional ? "Nacional" : comunidad;
      console.log(`  [ok] ${etiqueta}: congestión ${tasas.congestion ?? "—"}`);
    } catch (error) {
      fallos++;
      console.error(
        `  [error] ${documento.entidad}: ${error instanceof Error ? error.message : error}`,
      );
    }
    await new Promise((resolver) => setTimeout(resolver, PAUSA_MS));
  }

  if (Object.keys(comunidades).length === 0) {
    throw new Error("No se pudo extraer ningún indicador autonómico");
  }

  const fichero: FicheroIndicadores = {
    version_esquema: 1,
    anio,
    trimestre,
    fuente: { url, titulo },
    nacional,
    comunidades,
  };
  const destino = await escribirIndicadores(baseDir, fichero);
  console.log(
    `Indicadores ${anio}-T${trimestre}: ${Object.keys(comunidades).length} CCAA` +
      `${nacional ? " + nacional" : ""}${fallos > 0 ? `, ${fallos} fallos` : ""} → ${destino}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
