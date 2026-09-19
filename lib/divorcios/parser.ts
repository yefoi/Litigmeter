import * as cheerio from "cheerio";
import { valoresPorComunidad } from "../litigiosidad/comunidades";
import {
  aNumero,
  capturar,
  elegirTitulo,
  extraerFecha,
  inferirPeriodo,
  numeroDeGrupo,
} from "../litigiosidad/parser";
import type { ComunidadDivorcios, InformeDivorcios } from "./tipos";

function numeroNegado(
  coincidencia: RegExpMatchArray | undefined,
  grupo: number,
): number | undefined {
  const valor = numeroDeGrupo(coincidencia, grupo);
  return valor === undefined ? undefined : -valor;
}

export function parsearNotaDivorcios(html: string, url: string): InformeDivorcios {
  const $ = cheerio.load(html);
  const titulo = elegirTitulo($);
  const parrafos = $("div.textoArticulo p")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const cuerpo = parrafos.join("\n");
  const textoPagina = $("body").text().replace(/\s+/g, " ");
  const fechaPublicacion =
    extraerFecha($("header.cabeceraInterior").text()) ?? extraerFecha(textoPagina);
  const { anio, trimestre } = inferirPeriodo(titulo, cuerpo, fechaPublicacion);

  const total = capturar(cuerpo, /registraron en ese periodo un total de ([\d.]+) demandas/i);
  if (!total) {
    throw new Error("No se encontró el total de demandas de disolución matrimonial");
  }

  const divorciosNoConsensuados = capturar(
    cuerpo,
    /Las ([\d.]+) demandas de divorcio no consensuado suponen un descenso interanual del ([\d,]+) por ciento/i,
  );
  const divorciosConsensuados = capturar(
    cuerpo,
    /las ([\d.]+) demandas de divorcio consensuado representan una disminución del ([\d,]+) %/i,
  );
  const separacionesNoConsensuadas = capturar(
    cuerpo,
    /las demandas de separación no consensuada \(([\d.]+)\) decrecieron en un ([\d,]+) %/i,
  );
  const separacionesConsensuadas = capturar(
    cuerpo,
    /las demandas de separación consensuada \(([\d.]+)\) lo hicieron en un ([\d,]+) %/i,
  );
  const nulidades = capturar(
    cuerpo,
    /se presentaron ([\d.]+) demandas de nulidad, por las [\d.]+ presentadas en el primer trimestre de \d{4}, lo que representa un ([\d,]+) % menos/i,
  );
  const modificacionConsensuadas = capturar(
    cuerpo,
    /se presentaron ([\d.]+) demandas de modificación de medidas consensuadas, lo que ha supuesto un aumento interanual del ([\d,]+) por ciento/i,
  );
  const modificacionNoConsensuadas = capturar(
    cuerpo,
    /modificación de medidas no consensuadas, ([\d.]+), tuvo una variación a la baja del ([\d,]+) por ciento/i,
  );
  const guardaConsensuadas = capturar(
    cuerpo,
    /alimentos de hijos no matrimoniales consensuadas, ([\d.]+), se mantuvieron estables al mostrar una reducción interanual del ([\d,]+) por ciento/i,
  );
  const guardaNoConsensuadas = capturar(
    cuerpo,
    /mientras que las no consensuadas, ([\d.]+), disminuyeron un ([\d,]+) por ciento/i,
  );
  const tasaMedia = capturar(
    cuerpo,
    /la media nacional, que fue de ([\d,]+) demandas por cada 100\.000 habitantes/i,
  );

  const porComunidad = new Map<string, number>();
  for (const parrafo of parrafos) {
    if (!/por cada 100\.000 habitantes/i.test(parrafo)) continue;
    for (const valor of valoresPorComunidad(parrafo)) {
      if (!porComunidad.has(valor.comunidad_autonoma)) {
        porComunidad.set(valor.comunidad_autonoma, valor.valor);
      }
    }
  }
  const comunidades: ComunidadDivorcios[] = [...porComunidad]
    .map(([comunidad_autonoma, tasa_por_100000]) => ({ comunidad_autonoma, tasa_por_100000 }))
    .sort((a, b) => b.tasa_por_100000 - a.tasa_por_100000);

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
    nacional: {
      total: aNumero(total[1]),
      variacion_interanual_pct: numeroNegado(
        capturar(cuerpo, /disolución matrimonial.*?disminuyeron un ([\d,]+) % respecto/i),
        1,
      ),
      tasa_media_por_100000: numeroDeGrupo(tasaMedia, 1),
      divorcios_consensuados: divorciosConsensuados
        ? {
            total: aNumero(divorciosConsensuados[1]),
            variacion_interanual_pct: numeroNegado(divorciosConsensuados, 2),
          }
        : undefined,
      divorcios_no_consensuados: divorciosNoConsensuados
        ? {
            total: aNumero(divorciosNoConsensuados[1]),
            variacion_interanual_pct: numeroNegado(divorciosNoConsensuados, 2),
          }
        : undefined,
      separaciones_consensuadas: separacionesConsensuadas
        ? {
            total: aNumero(separacionesConsensuadas[1]),
            variacion_interanual_pct: numeroNegado(separacionesConsensuadas, 2),
          }
        : undefined,
      separaciones_no_consensuadas: separacionesNoConsensuadas
        ? {
            total: aNumero(separacionesNoConsensuadas[1]),
            variacion_interanual_pct: numeroNegado(separacionesNoConsensuadas, 2),
          }
        : undefined,
      nulidades: nulidades
        ? { total: aNumero(nulidades[1]), variacion_interanual_pct: numeroNegado(nulidades, 2) }
        : undefined,
      modificacion_medidas_consensuadas: modificacionConsensuadas
        ? {
            total: aNumero(modificacionConsensuadas[1]),
            variacion_interanual_pct: numeroDeGrupo(modificacionConsensuadas, 2),
          }
        : undefined,
      modificacion_medidas_no_consensuadas: modificacionNoConsensuadas
        ? {
            total: aNumero(modificacionNoConsensuadas[1]),
            variacion_interanual_pct: numeroNegado(modificacionNoConsensuadas, 2),
          }
        : undefined,
      guarda_custodia_consensuadas: guardaConsensuadas
        ? {
            total: aNumero(guardaConsensuadas[1]),
            variacion_interanual_pct: numeroNegado(guardaConsensuadas, 2),
          }
        : undefined,
      guarda_custodia_no_consensuadas: guardaNoConsensuadas
        ? {
            total: aNumero(guardaNoConsensuadas[1]),
            variacion_interanual_pct: numeroNegado(guardaNoConsensuadas, 2),
          }
        : undefined,
    },
    comunidades,
  };
}
