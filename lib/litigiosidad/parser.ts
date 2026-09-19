import * as cheerio from "cheerio";
import { COMUNIDADES } from "./ccaa";
import type { ComunidadParseada, NotaParseada, ResumenNacional } from "./tipos";

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const ORDINALES: Record<string, number> = {
  primer: 1,
  primero: 1,
  segundo: 2,
  tercer: 3,
  tercero: 3,
  cuarto: 4,
};

export function aNumero(valor: string): number {
  const limpio = valor.trim();
  if (limpio.includes(",")) {
    return Number.parseFloat(limpio.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    return Number.parseFloat(limpio.replace(/\./g, ""));
  }
  return Number.parseFloat(limpio);
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Por debajo de este número de comunidades la nota no es la nacional. */
const MINIMO_COMUNIDADES = 15;

export function extraerFecha(texto: string): string | undefined {
  const m = texto.match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i,
  );
  if (!m) return undefined;
  const mes = MESES[m[2].toLowerCase()];
  return `${m[3]}-${String(mes).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

export function inferirPeriodo(
  titulo: string,
  cuerpo: string,
  fechaPublicacion: string | undefined,
): { anio: number; trimestre: number } {
  const texto = `${titulo}\n${cuerpo}`;
  const coincidencias = [
    ...texto.matchAll(/(primer|primero|segundo|tercer|tercero|cuarto)\s+trimestre\s+de\s+(\d{4})/gi),
  ];
  if (coincidencias.length > 0) {
    // Las notas comparan con el mismo trimestre del año anterior: el periodo
    // del informe es el año más reciente citado junto a "trimestre de".
    let mejor: { anio: number; trimestre: number } | undefined;
    for (const coincidencia of coincidencias) {
      const anio = Number(coincidencia[2]);
      if (!mejor || anio > mejor.anio) {
        mejor = { anio, trimestre: ORDINALES[coincidencia[1].toLowerCase()] };
      }
    }
    if (mejor) return mejor;
  }
  if (!fechaPublicacion) {
    throw new Error("No se pudo determinar el año/trimestre de la nota");
  }
  const [anioPublicacion, mesPublicacion] = fechaPublicacion.split("-").map(Number);
  const trimestre = Math.floor(((mesPublicacion - 4 + 12) % 12) / 3) + 1;
  const anio = mesPublicacion <= 3 ? anioPublicacion - 1 : anioPublicacion;
  return { anio, trimestre };
}

function recortar(texto: string, maximo: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo);
  return `${corte.slice(0, corte.lastIndexOf(" "))}…`;
}

export function capturar(texto: string, patron: RegExp): RegExpMatchArray | undefined {
  return texto.match(patron) ?? undefined;
}

export function numeroDeGrupo(
  coincidencia: RegExpMatchArray | undefined,
  grupo: number,
): number | undefined {
  const valor = coincidencia?.[grupo];
  return valor === undefined ? undefined : aNumero(valor);
}

export function elegirTitulo($: cheerio.CheerioAPI): string {
  const preferido =
    $("header.cabeceraInterior h1").first().text() ||
    $('meta[property="og:title"]').attr("content") ||
    "";
  const limpio = preferido.replace(/\s+/g, " ").trim();
  if (limpio) return limpio;

  const h1s = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((texto) => texto.length > 0 && !/cookies?/i.test(texto))
    .sort((a, b) => b.length - a.length);
  return h1s[0] ?? $("title").text().replace(/\s+/g, " ").trim();
}

export function parseNotaLitigiosidad(html: string, url: string): NotaParseada {
  const $ = cheerio.load(html);

  const titulo = elegirTitulo($);

  const parrafos = $("div.textoArticulo p");
  const seleccion = parrafos.length > 0 ? parrafos : $("main p").length > 0 ? $("main p") : $("p");
  const cuerpo = seleccion
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .join("\n");

  const textoPagina = $("body").text().replace(/\s+/g, " ");
  const fechaPublicacion =
    extraerFecha($("header.cabeceraInterior").text()) ?? extraerFecha(textoPagina);
  const { anio, trimestre } = inferirPeriodo(titulo, cuerpo, fechaPublicacion);

  const nacionalActual = cuerpo.match(
    /tasa de litigiosidad en el conjunto de Espa\S+ (?:fue|ha sido) de ([\d.,]+) asuntos por cada 1\.000 habitantes/i,
  );
  if (!nacionalActual) {
    throw new Error("No se encontró la tasa de litigiosidad nacional en la nota");
  }
  const inicioCola = (nacionalActual.index ?? 0) + nacionalActual[0].length;
  const colaNacional = cuerpo.slice(inicioCola, inicioCola + 600);
  const nacionalAnterior = colaNacional.match(/(?:que fue de|se situ[oó] en)\s+([\d.,]+)/i);

  const tasaNacional = aNumero(nacionalActual[1]);
  const tasaNacionalAnterior = nacionalAnterior ? aNumero(nacionalAnterior[1]) : undefined;
  const nacional: ResumenNacional = {
    tasa_litigiosidad: tasaNacional,
    tasa_litigiosidad_anio_anterior: tasaNacionalAnterior,
    variacion_interanual_pct:
      tasaNacionalAnterior !== undefined
        ? redondear(((tasaNacional - tasaNacionalAnterior) / tasaNacionalAnterior) * 100)
        : undefined,
  };

  const comunidades: ComunidadParseada[] = [];
  const faltantes: string[] = [];
  for (const comunidad of COMUNIDADES) {
    let tasa: number | undefined;
    for (const nombre of [comunidad.nombre, ...comunidad.alias]) {
      const coincidencia = cuerpo.match(
        new RegExp(`${escaparRegex(nombre)}\\s*,?\\s*\\(([\\d]+(?:[.,][\\d]+)?)\\)`, "i"),
      );
      if (coincidencia) {
        tasa = aNumero(coincidencia[1]);
        break;
      }
    }
    if (tasa === undefined) {
      faltantes.push(comunidad.nombre);
    } else {
      comunidades.push({ nombre: comunidad.nombre, tasa });
    }
  }
  if (comunidades.length < MINIMO_COMUNIDADES) {
    throw new Error(
      `Solo se pudieron extraer ${comunidades.length} comunidades; faltan: ${faltantes.join(", ")}`,
    );
  }

  const pdfHref =
    $('aside#asociadosPies a[href$=".pdf"]').first().attr("href") ??
    $('a[href$=".pdf"]').first().attr("href");

  return {
    url,
    titulo,
    fecha_publicacion: fechaPublicacion,
    anio,
    trimestre,
    nacional,
    comunidades,
    comunidades_ausentes: faltantes,
    resumen: recortar(cuerpo, 2500),
    pdf_url: pdfHref ? new URL(pdfHref, url).href : undefined,
  };
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
