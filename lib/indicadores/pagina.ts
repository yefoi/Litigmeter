import * as cheerio from "cheerio";

const BASE = "https://www.poderjudicial.es";
const ORDINALES: Record<string, number> = {
  primer: 1,
  primero: 1,
  segundo: 2,
  tercer: 3,
  tercero: 3,
  cuarto: 4,
};

export function periodoDeTitulo(
  titulo: string,
): { anio: number; trimestre: number } | undefined {
  const coincidencia = titulo.match(
    /(primer|primero|segundo|tercer|tercero|cuarto)\s+trimestre\s+(?:de\s+)?(\d{4})/i,
  );
  if (!coincidencia) return undefined;
  return { anio: Number(coincidencia[2]), trimestre: ORDINALES[coincidencia[1].toLowerCase()] };
}

function entidadDeFichero(href: string): string | undefined {
  const fichero = decodeURIComponent(href.split("/").pop() ?? "");
  const coincidencia = fichero.match(/^Indicadores\s+(?:TSJ\s+)?(.+?)\s+-\s+/i);
  return coincidencia?.[1]?.trim();
}

export interface DocumentoInforme {
  entidad: string;
  url: string;
  esNacional: boolean;
}

export function documentosDeInforme(html: string): DocumentoInforme[] {
  const $ = cheerio.load(html);
  const documentos: DocumentoInforme[] = [];
  const vistas = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!/\.pdf$/i.test(href) || !/Indicadores\s/i.test(href)) return;
    const entidad = entidadDeFichero(href);
    if (!entidad) return;
    const url = new URL(href, BASE).href;
    if (vistas.has(url)) return;
    vistas.add(url);
    documentos.push({ entidad, url, esNacional: /nivel nacional/i.test(entidad) });
  });
  return documentos;
}
