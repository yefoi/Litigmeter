import * as cheerio from "cheerio";

export const FEED_PORTADA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/ch.En-Portada.formato1/";
const USER_AGENT = "litigmeter/0.1 (notas de prensa del CGPJ)";

export interface NotaCandidata {
  url: string;
  titulo: string;
}

export function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

export async function descargar(url: string): Promise<string> {
  const respuesta = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${url}`);
  return respuesta.text();
}

/**
 * Notas nacionales del feed "En Portada": se excluyen las de los TSJ para evitar
 * que una nota territorial pise el informe nacional del mismo trimestre.
 */
export async function candidatasDelFeed(
  coincideTitulo: (titulo: string) => boolean,
): Promise<NotaCandidata[]> {
  const xml = await descargar(FEED_PORTADA);
  const $ = cheerio.load(xml, { xmlMode: true });
  const candidatas: NotaCandidata[] = [];
  const vistas = new Set<string>();
  $("item").each((_, el) => {
    const titulo = $(el).find("title").text().replace(/\s+/g, " ").trim();
    const url = $(el).find("link").text().trim().replace(/^http:/, "https:");
    if (!coincideTitulo(titulo)) return;
    if (!/(Archivo-de-notas-de-prensa|Notas-de-prensa)\//.test(url)) return;
    if (/Tribunales-Superiores-de-Justicia/.test(url) || vistas.has(url)) return;
    vistas.add(url);
    candidatas.push({ url, titulo });
  });
  return candidatas;
}
