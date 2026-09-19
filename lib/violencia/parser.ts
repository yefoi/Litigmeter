import * as cheerio from "cheerio";
import { COMUNIDADES } from "../litigiosidad/ccaa";
import { aNumero, extraerFecha, inferirPeriodo } from "../litigiosidad/parser";
import type { DatosViolenciaNacional, InformeViolencia } from "./tipos";

function elegirTitulo($: cheerio.CheerioAPI): string {
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

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capturar(cuerpo: string, patron: RegExp): RegExpMatchArray | undefined {
  return cuerpo.match(patron) ?? undefined;
}

function numeroDeGrupo(coincidencia: RegExpMatchArray | undefined, grupo: number): number | undefined {
  const valor = coincidencia?.[grupo];
  return valor === undefined ? undefined : aNumero(valor);
}

/** Tasas por comunidad: solo se escanean los párrafos donde la nota las lista. */
function comunidadesConTasa(cuerpo: string): InformeViolencia["comunidades"] {
  const parrafos = cuerpo
    .split(/\n+/)
    .filter((parrafo) =>
      /tasa de v[ií]ctimas denunciantes|por encima de la media nacional|tasas inferiores a la media nacional/i.test(
        parrafo,
      ),
    );
  const resultados = new Map<string, number>();
  const patron = /([^;.()]{0,80}?),\s*con(?:\s+una\s+tasa\s+de)?\s*([\d]+(?:[.,][\d]+)?)/gi;

  for (const parrafo of parrafos) {
    for (const coincidencia of parrafo.matchAll(patron)) {
      const fragmento = coincidencia[1];
      const valor = aNumero(coincidencia[2]);
      for (const comunidad of COMUNIDADES) {
        const nombres = [comunidad.nombre, ...comunidad.alias];
        const aparece = nombres.some((nombre) =>
          new RegExp(`(^|[^\\p{L}])${escaparRegex(nombre)}([^\\p{L}]|$)`, "iu").test(
            fragmento,
          ),
        );
        if (aparece && !resultados.has(comunidad.nombre)) {
          resultados.set(comunidad.nombre, valor);
        }
      }
    }
  }

  return [...resultados]
    .map(([comunidad_autonoma, tasa_victimas_por_10000]) => ({
      comunidad_autonoma,
      tasa_victimas_por_10000,
    }))
    .sort((a, b) => b.tasa_victimas_por_10000 - a.tasa_victimas_por_10000);
}

export function parsearNotaViolencia(html: string, url: string): InformeViolencia {
  const $ = cheerio.load(html);
  const titulo = elegirTitulo($);
  const cuerpo = $("div.textoArticulo p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .join("\n");
  const textoPagina = $("body").text().replace(/\s+/g, " ");
  const fechaPublicacion =
    extraerFecha($("header.cabeceraInterior").text()) ?? extraerFecha(textoPagina);
  const { anio, trimestre } = inferirPeriodo(titulo, cuerpo, fechaPublicacion);

  const coincidenciaDenuncias = capturar(
    cuerpo,
    /denuncias por violencia de g[eé]nero recibidas[^(]*\(([\d.]+)\)[^%]*?un ([\d,]+) por ciento/i,
  );
  if (!coincidenciaDenuncias) {
    throw new Error("No se encontraron las denuncias por violencia de género en la nota");
  }

  const coincidenciaMujeres = capturar(
    cuerpo,
    /mujeres que denunciaron como v[ií]ctimas \(([\d.]+)\) lo hizo en un ([\d,]+) por ciento/i,
  );
  const coincidenciaTasa = capturar(
    cuerpo,
    /tasa de v[ií]ctimas denunciantes de violencia de g[eé]nero por cada 10\.000 mujeres fue de ([\d,]+)/i,
  );
  if (!coincidenciaTasa) {
    throw new Error("No se encontró la tasa de víctimas por 10.000 mujeres");
  }
  const coincidenciaDelta = capturar(cuerpo, /\(([\d,]+) puntos?\) m[aá]s alta/i);
  const coincidenciaRenuncias = capturar(
    cuerpo,
    /([\d.]+) mujeres v[ií]ctimas \(el ([\d,]+) % del total\)[^.]*?un ([\d,]+) % m[aá]s/i,
  );
  const coincidenciaOrdenesSolicitadas = capturar(
    cuerpo,
    /recibieron ([\d.]+) peticiones, un ([\d,]+) % menos/i,
  );
  const coincidenciaOrdenesAcordadas = capturar(
    cuerpo,
    /adoptaron ([\d.]+) [oó]rdenes y medidas de protecci[oó]n, un ([\d,]+) % menos/i,
  );
  const coincidenciaSentencias = capturar(
    cuerpo,
    /dictaron un total de ([\d.]+), de las que el ([\d,]+) % fueron condenatorias/i,
  );
  const coincidenciaViolenciaSexual = capturar(
    cuerpo,
    /violencia sexual[^.]*?un total de ([\d.]+) denuncias/i,
  );
  const coincidenciaOrdenesSexual = capturar(
    cuerpo,
    /se recibieron ([\d.]+) solicitudes de orden de protecci[oó]n, de las que se acordaron ([\d.]+)/i,
  );

  const nacional: DatosViolenciaNacional = {
    denuncias: aNumero(coincidenciaDenuncias[1]),
    denuncias_variacion_interanual_pct: numeroDeGrupo(coincidenciaDenuncias, 2),
    mujeres_denunciantes: numeroDeGrupo(coincidenciaMujeres, 1),
    mujeres_variacion_interanual_pct: numeroDeGrupo(coincidenciaMujeres, 2),
    tasa_victimas_por_10000: aNumero(coincidenciaTasa[1]),
    tasa_delta_puntos: numeroDeGrupo(coincidenciaDelta, 1),
    renuncias: numeroDeGrupo(coincidenciaRenuncias, 1),
    renuncias_pct: numeroDeGrupo(coincidenciaRenuncias, 2),
    renuncias_variacion_interanual_pct: numeroDeGrupo(coincidenciaRenuncias, 3),
    ordenes_solicitadas: numeroDeGrupo(coincidenciaOrdenesSolicitadas, 1),
    ordenes_solicitadas_variacion_pct: numeroDeGrupo(coincidenciaOrdenesSolicitadas, 2),
    ordenes_acordadas: numeroDeGrupo(coincidenciaOrdenesAcordadas, 1),
    ordenes_acordadas_variacion_pct: numeroDeGrupo(coincidenciaOrdenesAcordadas, 2),
    sentencias: numeroDeGrupo(coincidenciaSentencias, 1),
    sentencias_condenatorias_pct: numeroDeGrupo(coincidenciaSentencias, 2),
    violencia_sexual_denuncias: numeroDeGrupo(coincidenciaViolenciaSexual, 1),
    violencia_sexual_ordenes_solicitadas: numeroDeGrupo(coincidenciaOrdenesSexual, 1),
    violencia_sexual_ordenes_acordadas: numeroDeGrupo(coincidenciaOrdenesSexual, 2),
  };

  const pdfHref =
    $('aside#asociadosPies a[href$=".pdf"]').first().attr("href") ??
    $('a[href$=".pdf"]').first().attr("href");

  return {
    version_esquema: 1,
    anio,
    trimestre,
    generado_en: new Date().toISOString(),
    origen: "nota_prensa",
    fuente: {
      url,
      titulo,
      fecha_publicacion: fechaPublicacion,
      pdf_url: pdfHref ? new URL(pdfHref, url).href : undefined,
    },
    nacional,
    comunidades: comunidadesConTasa(cuerpo),
  };
}
