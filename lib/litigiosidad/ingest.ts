import * as cheerio from "cheerio";
import path from "node:path";
import { leerEvidencias } from "../edictos/evidencias";
import { clasificarTrimestre } from "./classify";
import {
  buscarRegistro,
  construirDatoTrimestral,
  claveInforme,
  escribirInforme,
  leerInforme,
  leerInformes,
  redondear,
} from "./historico";
import { parseNotaLitigiosidad } from "./parser";
import type { DatoTrimestral, InformeTrimestral, RegistroComunidad } from "./tipos";

const BASE = "https://www.poderjudicial.es";
const FEED_PORTADA = `${BASE}/cgpj/es/Poder-Judicial/ch.En-Portada.formato1/`;
const LISTADO_NOTAS = `${BASE}/cgpj/es/Poder-Judicial/Consejo-General-del-Poder-Judicial/Oficina-de-Comunicacion/Notas-de-prensa/`;
const PATRON_CANDIDATA = /trimestre/i;
const EXCLUIR_CANDIDATA =
  /violencia|disoluci[oó]n|hipotecar|denuncia|corrupci[oó]n|nulidades|divorcio|menores|extranjer|cargas? de trabajo|previsi[oó]n/i;
const USER_AGENT = "litigmeter/0.1 (seguimiento estadistico de notas del CGPJ)";

export interface CandidataNota {
  url: string;
  titulo: string;
  fecha?: string;
}

export interface NotaDescubierta {
  url: string;
  html: string;
}

export interface OpcionesIngesta {
  /** URL explícita de la nota; si falta se descubre automáticamente. */
  url?: string;
  /** Directorio de datos; por defecto data/litigiosidad. */
  dataDir?: string;
  /** Directorio de evidencia de edictos; por defecto data/edictos. */
  edictosDir?: string;
  /** Omite la clasificación con jev aunque haya API key. */
  sinClasificar?: boolean;
  /** Reescribe el fichero aunque ya exista completo. */
  force?: boolean;
  /** Vuelve a clasificar aunque ya existan clasificaciones (p. ej. tras añadir evidencia). */
  reclasificar?: boolean;
  fetchImpl?: typeof fetch;
}

export interface ResultadoIngesta {
  estado: "creado" | "actualizado" | "sin_cambios";
  fichero: string;
  informe: InformeTrimestral;
  clasificados: number;
  clasificacionOmitida: boolean;
}

async function descargar(url: string, fetchImpl: typeof fetch): Promise<string> {
  const respuesta = await fetchImpl(url, {
    headers: {
      "user-agent": USER_AGENT,
      "accept-language": "es-ES,es;q=0.9",
    },
  });
  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status} al descargar ${url}`);
  }
  return respuesta.text();
}

function candidatasDeFeed(xml: string): CandidataNota[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const candidatas: CandidataNota[] = [];
  $("item").each((_, el) => {
    const titulo = $(el).find("title").text().replace(/\s+/g, " ").trim();
    const url = $(el).find("link").text().trim();
    const fecha = $(el).find("pubDate").text().trim();
    if (!PATRON_CANDIDATA.test(titulo) || EXCLUIR_CANDIDATA.test(titulo)) return;
    if (!/(Archivo-de-notas-de-prensa|Notas-de-prensa)\//.test(url)) return;
    candidatas.push({ url: url.replace(/^http:/, "https:"), titulo, fecha });
  });
  return candidatas;
}

function candidatasDeListado(html: string): CandidataNota[] {
  const $ = cheerio.load(html);
  const candidatas: CandidataNota[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const titulo = $(el).text().replace(/\s+/g, " ").trim();
    if (!PATRON_CANDIDATA.test(titulo) || EXCLUIR_CANDIDATA.test(titulo)) return;
    if (!/(Archivo-de-notas-de-prensa|Notas-de-prensa)\//.test(href)) return;
    candidatas.push({ url: new URL(href, BASE).href, titulo });
  });
  return candidatas;
}

/**
 * Recopila notas trimestrales nacionales del feed "En Portada" y del listado de
 * notas, y valida cada candidata parseándola: solo la nota nacional incluye las
 * tasas de las 17 comunidades. Devuelve las válidas de más reciente a más antigua.
 */
export async function descubrirNotas(
  opciones: { anio?: number; maximo?: number; fetchImpl?: typeof fetch } = {},
): Promise<NotaDescubierta[]> {
  const fetchImpl = opciones.fetchImpl ?? fetch;
  const candidatas: CandidataNota[] = [];
  try {
    candidatas.push(...candidatasDeFeed(await descargar(FEED_PORTADA, fetchImpl)));
  } catch {
    // Sin feed: se intenta solo con el listado.
  }
  try {
    candidatas.push(...candidatasDeListado(await descargar(LISTADO_NOTAS, fetchImpl)));
  } catch {
    // Sin listado: quedan las candidatas del feed.
  }

  const vistas = new Set<string>();
  const validas: NotaDescubierta[] = [];
  const maximo = opciones.maximo ?? 20;
  for (const candidata of candidatas) {
    if (validas.length >= maximo) break;
    if (vistas.has(candidata.url)) continue;
    vistas.add(candidata.url);
    if (opciones.anio && candidata.fecha && !candidata.fecha.includes(String(opciones.anio))) {
      continue;
    }
    try {
      const html = await descargar(candidata.url, fetchImpl);
      parseNotaLitigiosidad(html, candidata.url);
      validas.push({ url: candidata.url, html });
    } catch {
      // No es la nota nacional (otra estadística, ámbito territorial, etc.).
    }
  }
  return validas;
}

async function mapearConLimite<T, R>(
  items: T[],
  limite: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const resultados = new Array<R>(items.length);
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (true) {
      const indice = siguiente++;
      if (indice >= items.length) return;
      resultados[indice] = await fn(items[indice]);
    }
  });
  await Promise.all(trabajadores);
  return resultados;
}

export async function ingerirNota(
  url: string,
  html: string,
  opciones: OpcionesIngesta = {},
): Promise<ResultadoIngesta> {
  const dataDir = opciones.dataDir ?? path.join(process.cwd(), "data", "litigiosidad");
  const edictosDir = opciones.edictosDir ?? path.join(process.cwd(), "data", "edictos");
  const nota = parseNotaLitigiosidad(html, url);
  console.log(`Informe detectado: ${nota.anio}-T${nota.trimestre} "${nota.titulo}"`);
  if (nota.comunidades_ausentes.length > 0) {
    console.warn(`  aviso: sin tasa publicada para ${nota.comunidades_ausentes.join(", ")}`);
  }

  const evidencias = await leerEvidencias(edictosDir, nota.anio, nota.trimestre);
  if (evidencias) {
    console.log(
      `Evidencia de edictos: ${Object.keys(evidencias.comunidades).length} comunidades.`,
    );
  }

  const historicos = (await leerInformes(dataDir)).filter(
    (i) => !(i.anio === nota.anio && i.trimestre === nota.trimestre),
  );
  const existente = await leerInforme(dataDir, nota.anio, nota.trimestre);

  const comunidadesOrdenadas = [...nota.comunidades].sort((a, b) => b.tasa - a.tasa);
  const datos: DatoTrimestral[] = comunidadesOrdenadas.map((comunidad) =>
    construirDatoTrimestral({
      anio: nota.anio,
      trimestre: nota.trimestre,
      comunidad: comunidad.nombre,
      tasaActual: comunidad.tasa,
      tasaNacional: nota.nacional.tasa_litigiosidad,
      resumenNota: nota.resumen,
      historicos,
      edictosRepresentativos: evidencias?.comunidades[comunidad.nombre],
    }),
  );

  const registros: RegistroComunidad[] = datos.map((dato, indice) => {
    const previo = buscarRegistro(existente, dato.comunidad_autonoma);
    return {
      comunidad_autonoma: dato.comunidad_autonoma,
      tasa_litigiosidad: dato.tasa_litigiosidad_actual,
      tasa_litigiosidad_trimestre_anterior: dato.tasa_litigiosidad_trimestre_anterior,
      variacion_trimestral_pct: dato.variacion_trimestral_pct,
      variacion_interanual_pct: dato.variacion_interanual_pct,
      diferencial_vs_nacional: redondear(
        dato.tasa_litigiosidad_actual - dato.tasa_litigiosidad_media_nacional,
      ),
      posicion_nacional: indice + 1,
      clasificacion: opciones.reclasificar ? undefined : previo?.clasificacion,
      error_clasificacion: opciones.reclasificar ? undefined : previo?.error_clasificacion,
    };
  });

  const hayApiKey = Boolean(process.env.TYPESAFE_AI_API_KEY?.trim());
  const debeClasificar = hayApiKey && !opciones.sinClasificar;
  const fichero = path.join(dataDir, `${claveInforme(nota.anio, nota.trimestre)}.json`);
  const completas = registros.every((registro) => registro.clasificacion);

  if (existente && !opciones.force && !opciones.reclasificar && (completas || !debeClasificar)) {
    return {
      estado: "sin_cambios",
      fichero,
      informe: existente,
      clasificados: 0,
      clasificacionOmitida: !completas,
    };
  }

  let clasificados = 0;
  if (debeClasificar) {
    const pendientes = registros
      .map((registro, indice) => ({ registro, dato: datos[indice] }))
      .filter(({ registro }) => !registro.clasificacion);
    console.log(`Clasificando ${pendientes.length} comunidades con jev-latest...`);
    await mapearConLimite(pendientes, 4, async ({ registro, dato }) => {
      try {
        const clasificacion = await clasificarTrimestre(dato);
        registro.clasificacion = clasificacion;
        delete registro.error_clasificacion;
        clasificados++;
        const aviso = clasificacion.es_noticiable ? " [noticiable]" : "";
        console.log(
          `  [ok] ${registro.comunidad_autonoma}: ${clasificacion.tendencia}, ` +
            `gravedad ${clasificacion.gravedad_congestion.toFixed(2)}${aviso}`,
        );
      } catch (error) {
        registro.error_clasificacion = error instanceof Error ? error.message : String(error);
        console.error(`  [error] ${registro.comunidad_autonoma}: ${registro.error_clasificacion}`);
      }
    });
  } else if (!hayApiKey) {
    console.log("TYPESAFE_AI_API_KEY no definida: se guardan los datos sin clasificar.");
  }

  const informe: InformeTrimestral = {
    version_esquema: 1,
    anio: nota.anio,
    trimestre: nota.trimestre,
    generado_en: new Date().toISOString(),
    fuente: {
      url: nota.url,
      titulo: nota.titulo,
      fecha_publicacion: nota.fecha_publicacion,
      pdf_url: nota.pdf_url,
    },
    resumen_nota: nota.resumen,
    nacional: nota.nacional,
    comunidades: registros,
  };

  await escribirInforme(dataDir, informe);

  return {
    estado: existente ? "actualizado" : "creado",
    fichero,
    informe,
    clasificados,
    clasificacionOmitida: !debeClasificar,
  };
}

export async function ingestaTrimestral(
  opciones: OpcionesIngesta = {},
): Promise<ResultadoIngesta> {
  const fetchImpl = opciones.fetchImpl ?? fetch;
  let url = opciones.url;
  let html: string | undefined;
  if (!url) {
    const [descubierta] = await descubrirNotas({
      anio: new Date().getFullYear(),
      maximo: 1,
      fetchImpl,
    });
    if (!descubierta) {
      throw new Error("No se encontró una nota trimestral nacional; pasa --url explícita");
    }
    url = descubierta.url;
    html = descubierta.html;
  }
  html ??= await descargar(url, fetchImpl);
  console.log(`Nota: ${url}`);
  return ingerirNota(url, html, opciones);
}

/** Ingesta todas las notas trimestrales descubiertas, de la más antigua a la más reciente. */
export async function ingestaDeFeed(
  opciones: OpcionesIngesta = {},
): Promise<ResultadoIngesta[]> {
  const notas = await descubrirNotas({ fetchImpl: opciones.fetchImpl });
  const resultados: ResultadoIngesta[] = [];
  for (const nota of [...notas].reverse()) {
    console.log(`\n--- ${nota.url}`);
    try {
      resultados.push(await ingerirNota(nota.url, nota.html, opciones));
    } catch (error) {
      console.error(`[error] ${nota.url}: ${error instanceof Error ? error.message : error}`);
    }
  }
  return resultados;
}
