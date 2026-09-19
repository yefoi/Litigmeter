import * as cheerio from "cheerio";
import path from "node:path";
import { escribirInformeViolencia, leerInformeViolencia } from "../lib/violencia/ficheros";
import { parsearNotaViolencia } from "../lib/violencia/parser";

const FEED_PORTADA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/ch.En-Portada.formato1/";
const USER_AGENT = "litigmeter/0.1 (notas de violencia de género del CGPJ)";

interface Candidata {
  url: string;
  titulo: string;
}

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function descargar(url: string): Promise<string> {
  const respuesta = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${url}`);
  return respuesta.text();
}

async function candidatasDelFeed(): Promise<Candidata[]> {
  const xml = await descargar(FEED_PORTADA);
  const $ = cheerio.load(xml, { xmlMode: true });
  const candidatas: Candidata[] = [];
  const vistas = new Set<string>();
  $("item").each((_, el) => {
    const titulo = $(el).find("title").text().replace(/\s+/g, " ").trim();
    const url = $(el).find("link").text().trim().replace(/^http:/, "https:");
    if (!/violencia de g[eé]nero/i.test(titulo) || !/trimestre/i.test(titulo)) return;
    if (!/(Archivo-de-notas-de-prensa|Notas-de-prensa)\//.test(url) || vistas.has(url)) return;
    vistas.add(url);
    candidatas.push({ url, titulo });
  });
  return candidatas;
}

async function ingerir(
  dataBaseDir: string,
  candidata: Candidata,
  force: boolean,
): Promise<"creado" | "omitido" | "error"> {
  try {
    const informe = parsearNotaViolencia(await descargar(candidata.url), candidata.url);
    if (!force && (await leerInformeViolencia(dataBaseDir, informe.anio, informe.trimestre))) {
      return "omitido";
    }
    await escribirInformeViolencia(dataBaseDir, informe);
    console.log(
      `  ${informe.anio}-T${informe.trimestre}: ${informe.nacional.denuncias} denuncias, ` +
        `${informe.comunidades.length} CCAA → data/violencia`,
    );
    return "creado";
  } catch (error) {
    console.error(
      `  [error] ${candidata.titulo.slice(0, 60)}: ${error instanceof Error ? error.message : error}`,
    );
    return "error";
  }
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const force = process.argv.includes("--force");
  const urlDirecta = opcion("url");

  const candidatas: Candidata[] = urlDirecta
    ? [{ url: urlDirecta, titulo: urlDirecta }]
    : process.argv.includes("--todas")
      ? await candidatasDelFeed()
      : (await candidatasDelFeed()).slice(0, 1);

  if (candidatas.length === 0) {
    console.log("Sin notas trimestrales de violencia de género en el feed; nada que hacer.");
    return;
  }

  let creados = 0;
  for (const candidata of candidatas) {
    const resultado = await ingerir(dataBase, candidata, force);
    if (resultado === "creado") creados++;
  }
  console.log(`Violencia de género: ${creados} informes nuevos de ${candidatas.length} notas.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
