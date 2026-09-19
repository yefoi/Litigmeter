import * as cheerio from "cheerio";
import { normalizarComunidad } from "../litigiosidad/ccaa";
import { valoresPorComunidad } from "../litigiosidad/comunidades";
import {
  aNumero,
  capturar,
  elegirTitulo,
  extraerFecha,
  inferirPeriodo,
  numeroDeGrupo,
} from "../litigiosidad/parser";
import type { InformeCrisis, IndicadorCrisis, RankingCrisis } from "./tipos";

function numeroNegado(
  coincidencia: RegExpMatchArray | undefined,
  grupo: number,
): number | undefined {
  const valor = numeroDeGrupo(coincidencia, grupo);
  return valor === undefined ? undefined : -valor;
}

function parrafoCon(parrafos: string[], fragmento: string): string | undefined {
  return parrafos.find((parrafo) => parrafo.includes(fragmento));
}

function parrafoQueCumple(parrafos: string[], patron: RegExp): string | undefined {
  return parrafos.find((parrafo) => patron.test(parrafo));
}

function recortar(parrafo: string | undefined, marca: string): string {
  if (!parrafo) return "";
  const corte = parrafo.indexOf(marca);
  return corte === -1 ? parrafo : parrafo.slice(0, corte);
}

function anadirRanking(
  rankings: RankingCrisis[],
  indicador: IndicadorCrisis,
  parrafos: Array<string | undefined>,
): void {
  const vistos = new Set(
    rankings
      .filter((entrada) => entrada.indicador === indicador)
      .map((entrada) => entrada.comunidad_autonoma),
  );
  for (const parrafo of parrafos) {
    if (!parrafo) continue;
    for (const valor of valoresPorComunidad(parrafo)) {
      if (vistos.has(valor.comunidad_autonoma)) continue;
      vistos.add(valor.comunidad_autonoma);
      rankings.push({ indicador, ...valor });
    }
  }
}

export function parsearNotaCrisis(html: string, url: string): InformeCrisis {
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

  const totalLanzamientos = capturar(cuerpo, /practicaron un total de ([\d.]+) lanzamientos/i);
  if (!totalLanzamientos) {
    throw new Error("No se encontraron los lanzamientos practicados en la nota");
  }

  const lanzamientosVariacion =
    numeroNegado(
      capturar(cuerpo, /trimestre del año se redujo un ([\d,]+) por ciento/i),
      1,
    ) ?? numeroNegado(capturar(cuerpo, /lanzamientos en toda España, un ([\d,]+) % menos/i), 1);

  const cuotaLau = capturar(
    cuerpo,
    /derivados del impago del alquiler, que representaron el ([\d,]+) % del total y que se redujeron en un ([\d,]+) por ciento/i,
  );
  const lauNuevo = capturar(
    cuerpo,
    /Arrendamientos Urbanos \(LAU\) sumaron ([\d.]+) en el primer trimestre del año, lo que ha supuesto en descenso interanual del ([\d,]+) por ciento/i,
  );
  const lauViejo = capturar(
    cuerpo,
    /El ([\d,]+) % de los lanzamientos, ([\d.]+), fue consecuencia de procedimientos derivados de la Ley de Arrendamientos Urbanos/i,
  );
  const lauVariacion =
    numeroNegado(lauNuevo, 2) ??
    numeroNegado(
      capturar(
        cuerpo,
        /Para los derivados de la Ley de Arrendamientos Urbanos la disminución fue del ([\d,]+) por ciento/i,
      ),
      1,
    );

  const hipotecariosNuevo = capturar(
    cuerpo,
    /derivados de ejecuciones hipotecarias supusieron el ([\d,]+) % y mostraron una disminución interanual del ([\d,]+) por ciento/i,
  );
  const hipotecariosViejo = capturar(
    cuerpo,
    /otros [\d.]+ \(el ([\d,]+) %\) se derivó de ejecuciones hipotecarias/i,
  );
  const hipotecariosVariacion =
    numeroNegado(hipotecariosNuevo, 2) ??
    numeroNegado(
      capturar(
        cuerpo,
        /lanzamientos derivados de ejecuciones hipotecarias se redujeron en un ([\d,]+) %/i,
      ),
      1,
    );

  const otrasNuevo = capturar(
    cuerpo,
    /otras causas que se practicaron en el primer trimestre del año fueron ([\d.]+), un ([\d,]+) % menos/i,
  );
  const otrasViejo = capturar(cuerpo, /Los ([\d.]+) restantes obedecieron a otras causas/i);
  const otrasVariacion =
    numeroNegado(otrasNuevo, 2) ??
    numeroDeGrupo(capturar(cuerpo, /otras causas aumentaron un ([\d,]+) por ciento/i), 1);

  const solicitados = capturar(
    cuerpo,
    /fue de ([\d.]+), un ([\d,]+) % más que en (?:el )?mismo trimestre de \d{4}/i,
  );
  const cumplimiento = capturar(
    cuerpo,
    /De ellos, ([\d.]+) terminaron con cumplimiento positivo, lo que representa un incremento interanual del ([\d,]+) por ciento/i,
  );
  const ejecuciones = capturar(
    cuerpo,
    /se (?:han )?present(?:aron|ad[oa]) ([\d.]+) ejecuciones hipotecarias, un ([\d,]+) % más/i,
  );

  const concursosNuevo = capturar(
    cuerpo,
    /total de concursos ingresados durante el trimestre analizado fue de ([\d.]+) \(incremento del ([\d,]+) %\)/i,
  );
  const concursosViejo = capturar(
    cuerpo,
    /recibieron un total de ([\d.]+) concursos, lo que supone un nuevo incremento, situado en el ([\d,]+) por ciento/i,
  );
  const juridicas = capturar(
    cuerpo,
    /concursos de personas jurídicas[^.]*?se presentaron ([\d.]+), un ([\d,]+) % menos/i,
  );
  const empresarios = capturar(
    cuerpo,
    /concursos presentados por personas naturales empresarios, ([\d.]+), mostraron un descenso(?: interanual)? del ([\d,]+) (?:por ciento|%)/i,
  );
  const noEmpresarios = capturar(
    cuerpo,
    /no empresarios, ([\d.]+), mostraron un incremento del ([\d,]+) %/i,
  );
  const declarados = capturar(
    cuerpo,
    /Juzgados de lo Mercantil fue de ([\d.]+), con un incremento(?: interanual)? del ([\d,]+) (?:por ciento|%)/i,
  );
  const convenio = capturar(
    cuerpo,
    /llegaron a la fase de convenio un total de ([\d.]+) concursos \(un ([\d,]+) % menos/i,
  );
  const liquidacion = capturar(
    cuerpo,
    /iniciaron la fase de liquidación ([\d.]+), un ([\d,]+) % más/i,
  );
  const ere = capturar(
    cuerpo,
    /se (?:han )?present(?:aron|ad[oa]) ([\d.]+) expedientes, un ([\d,]+) % (menos|más)/i,
  );
  const ereVariacion = ere
    ? ere[3].toLowerCase() === "menos"
      ? -aNumero(ere[2])
      : aNumero(ere[2])
    : undefined;

  const despidosNuevo = capturar(
    cuerpo,
    /se han presentado ([\d.]+) demandas por despido, un ([\d,]+) % más/i,
  );
  const despidosViejo = capturar(
    cuerpo,
    /se presentaron ([\d.]+) demandas por despido, lo que supone un incremento interanual del ([\d,]+) por ciento/i,
  );
  const reclamacionesNuevo = capturar(
    cuerpo,
    /en total ([\d.]+), fue un ([\d,]+) % inferior/i,
  );
  const reclamacionesViejo = capturar(
    cuerpo,
    /fueron ([\d.]+) en el trimestre analizado, lo que en términos porcentuales equivale a un descenso interanual del ([\d,]+) por ciento/i,
  );
  const monitoriosNuevo = capturar(
    cuerpo,
    /fueron ([\d.]+), lo que supone un marcado descenso, situado en el ([\d,]+) por ciento/i,
  );
  const monitoriosViejo = capturar(
    cuerpo,
    /fueron ([\d.]+), lo que supone un descenso interanual del ([\d,]+) por ciento/i,
  );
  const ocupacion = capturar(cuerpo, /ingresaron ([\d.]+), un ([\d,]+) % menos/i);

  const rankings: RankingCrisis[] = [];
  anadirRanking(rankings, "lanzamientos", [
    parrafoCon(parrafos, "del total de lanzamientos practicados"),
    parrafoCon(parrafos, "se practicaron más lanzamientos"),
  ]);
  anadirRanking(rankings, "lanzamientos_lau", [
    parrafoCon(parrafos, "Teniendo en cuenta solo este tipo de lanzamientos"),
    parrafoCon(parrafos, "Atendiendo solo a los lanzamientos"),
  ]);
  anadirRanking(rankings, "lanzamientos_hipotecarios", [
    parrafoCon(parrafos, "Los lanzamientos derivados de ejecuciones hipotecarias disminuyeron"),
    parrafoCon(parrafos, "En cuanto a los derivados de ejecuciones hipotecarias"),
  ]);
  anadirRanking(rankings, "ejecuciones_hipotecarias", [
    recortar(parrafoCon(parrafos, "se dio en Cataluña"), "Si ponemos"),
  ]);
  anadirRanking(rankings, "concursos", [
    parrafoCon(parrafos, "El número total de concursos"),
    parrafoCon(parrafos, "Atendiendo al total de concursos"),
  ]);
  anadirRanking(rankings, "concursos_personas_juridicas", [
    parrafoCon(parrafos, "Respecto a los concursos de personas jurídicas"),
  ]);
  anadirRanking(rankings, "concursos_naturales_empresarios", [
    parrafoCon(parrafos, "Los concursos presentados por personas naturales empresarios"),
  ]);
  anadirRanking(rankings, "concursos_naturales_no_empresarios", [
    parrafoCon(parrafos, "Los concursos presentados por personas naturales no empresarios"),
  ]);
  anadirRanking(rankings, "despidos", [
    parrafoCon(parrafos, "se presentaron más demandas de este tipo"),
  ]);
  anadirRanking(rankings, "monitorios", [
    parrafoCon(parrafos, "La mayor utilización de este tipo de procedimiento"),
  ]);
  anadirRanking(rankings, "ocupacion_ilegal", [
    parrafoQueCumple(parrafos, /de \d{4} ingresaron [\d.]+/),
  ]);

  const reclamacionesNuevoTop = capturar(
    cuerpo,
    /De ellas, ([\d.]+) se registraron en ([^,]+), el [\d,]+ % del total; ([\d.]+) en ([^,]+), ([\d.]+) en ([^,]+) y ([\d.]+) en ([^.;]+)/i,
  );
  const reclamacionesViejoTop = capturar(
    cuerpo,
    /De ellas, ([\d.]+) se presentaron en (.+?) \([\d,]+ % del total nacional\); ([\d.]+), en (.+?)(?: y ([\d.]+), en ([^.;]+))?\./i,
  );
  const pares: Array<[string | undefined, string | undefined]> = reclamacionesNuevoTop
    ? [
        [reclamacionesNuevoTop[2], reclamacionesNuevoTop[1]],
        [reclamacionesNuevoTop[4], reclamacionesNuevoTop[3]],
        [reclamacionesNuevoTop[6], reclamacionesNuevoTop[5]],
        [reclamacionesNuevoTop[8], reclamacionesNuevoTop[7]],
      ]
    : reclamacionesViejoTop
      ? [
          [reclamacionesViejoTop[2], reclamacionesViejoTop[1]],
          [reclamacionesViejoTop[4], reclamacionesViejoTop[3]],
          [reclamacionesViejoTop[6], reclamacionesViejoTop[5]],
        ]
      : [];
  for (const [nombre, valor] of pares) {
    if (!nombre || !valor) continue;
    const comunidad = normalizarComunidad(nombre.replace(/^la\s+/i, "").trim());
    if (comunidad) {
      rankings.push({
        indicador: "reclamaciones_cantidad",
        comunidad_autonoma: comunidad,
        valor: aNumero(valor),
      });
    }
  }

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
      lanzamientos: {
        total: aNumero(totalLanzamientos[1]),
        variacion_interanual_pct: lanzamientosVariacion,
        lau: lauNuevo ? aNumero(lauNuevo[1]) : lauViejo ? aNumero(lauViejo[2]) : 0,
        lau_pct_del_total: numeroDeGrupo(lauViejo, 1) ?? numeroDeGrupo(cuotaLau, 1),
        lau_variacion_interanual_pct: lauVariacion,
        hipotecarios_pct_del_total: numeroDeGrupo(hipotecariosNuevo, 1) ?? numeroDeGrupo(hipotecariosViejo, 1),
        hipotecarios_variacion_interanual_pct: hipotecariosVariacion,
        otras: numeroDeGrupo(otrasNuevo, 1) ?? numeroDeGrupo(otrasViejo, 1),
        otras_variacion_interanual_pct: otrasVariacion,
        solicitados: numeroDeGrupo(solicitados, 1),
        solicitados_variacion_interanual_pct: numeroDeGrupo(solicitados, 2),
        solicitados_cumplimiento_positivo: numeroDeGrupo(cumplimiento, 1),
        solicitados_cumplimiento_variacion_pct: numeroDeGrupo(cumplimiento, 2),
      },
      ejecuciones_hipotecarias: {
        total: numeroDeGrupo(ejecuciones, 1) ?? 0,
        variacion_interanual_pct: numeroDeGrupo(ejecuciones, 2),
      },
      concursos: {
        total: concursosNuevo
          ? aNumero(concursosNuevo[1])
          : concursosViejo
            ? aNumero(concursosViejo[1])
            : 0,
        variacion_interanual_pct:
          numeroDeGrupo(concursosNuevo, 2) ?? numeroDeGrupo(concursosViejo, 2),
        personas_juridicas: numeroDeGrupo(juridicas, 1),
        personas_juridicas_variacion_interanual_pct: numeroNegado(juridicas, 2),
        naturales_empresarios: numeroDeGrupo(empresarios, 1),
        naturales_empresarios_variacion_interanual_pct: numeroNegado(empresarios, 2),
        naturales_no_empresarios: numeroDeGrupo(noEmpresarios, 1),
        naturales_no_empresarios_variacion_interanual_pct: numeroDeGrupo(noEmpresarios, 2),
        declarados: numeroDeGrupo(declarados, 1),
        declarados_variacion_interanual_pct: numeroDeGrupo(declarados, 2),
        fase_convenio: numeroDeGrupo(convenio, 1),
        fase_convenio_variacion_pct: numeroNegado(convenio, 2),
        fase_liquidacion: numeroDeGrupo(liquidacion, 1),
        fase_liquidacion_variacion_pct: numeroDeGrupo(liquidacion, 2),
        ere_art169: numeroDeGrupo(ere, 1),
        ere_art169_variacion_pct: ereVariacion,
      },
      despidos: {
        total: numeroDeGrupo(despidosNuevo, 1) ?? numeroDeGrupo(despidosViejo, 1) ?? 0,
        variacion_interanual_pct:
          numeroDeGrupo(despidosNuevo, 2) ?? numeroDeGrupo(despidosViejo, 2),
      },
      reclamaciones_cantidad: {
        total: numeroDeGrupo(reclamacionesNuevo, 1) ?? numeroDeGrupo(reclamacionesViejo, 1) ?? 0,
        variacion_interanual_pct:
          numeroNegado(reclamacionesNuevo, 2) ?? numeroNegado(reclamacionesViejo, 2),
      },
      monitorios: {
        total: numeroDeGrupo(monitoriosNuevo, 1) ?? numeroDeGrupo(monitoriosViejo, 1) ?? 0,
        variacion_interanual_pct:
          numeroNegado(monitoriosNuevo, 2) ?? numeroNegado(monitoriosViejo, 2),
      },
      ocupacion_ilegal: {
        total: numeroDeGrupo(ocupacion, 1) ?? 0,
        variacion_interanual_pct: numeroNegado(ocupacion, 2),
      },
    },
    rankings,
  };
}
