import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvidenciaEdicto } from "../edictos/tipos";
import type { TasasIndicadores } from "../indicadores/tipos";
import type {
  DatoTrimestral,
  InformeTrimestral,
  PuntoAnual,
  PuntoSerie,
  RegistroComunidad,
} from "./tipos";

export function claveInforme(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export function trimestreAnterior(
  anio: number,
  trimestre: number,
): { anio: number; trimestre: number } {
  return trimestre === 1 ? { anio: anio - 1, trimestre: 4 } : { anio, trimestre: trimestre - 1 };
}

function ordenTrimestre(informe: { anio: number; trimestre: number }): number {
  return informe.anio * 4 + informe.trimestre;
}

export async function leerInformes(dataDir: string): Promise<InformeTrimestral[]> {
  let ficheros: string[];
  try {
    ficheros = await readdir(dataDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const informes: InformeTrimestral[] = [];
  for (const fichero of ficheros.filter((f) => /^\d{4}-T[1-4]\.json$/.test(f))) {
    const contenido = await readFile(path.join(dataDir, fichero), "utf8");
    informes.push(JSON.parse(contenido) as InformeTrimestral);
  }
  return informes.sort((a, b) => ordenTrimestre(a) - ordenTrimestre(b));
}

export async function leerInforme(
  dataDir: string,
  anio: number,
  trimestre: number,
): Promise<InformeTrimestral | undefined> {
  try {
    const contenido = await readFile(path.join(dataDir, `${claveInforme(anio, trimestre)}.json`), "utf8");
    return JSON.parse(contenido) as InformeTrimestral;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirInforme(dataDir: string, informe: InformeTrimestral): Promise<string> {
  await mkdir(dataDir, { recursive: true });
  const ruta = path.join(dataDir, `${claveInforme(informe.anio, informe.trimestre)}.json`);
  await writeFile(ruta, `${JSON.stringify(informe, null, 2)}\n`, "utf8");
  return ruta;
}

export function buscarRegistro(
  informe: InformeTrimestral | undefined,
  comunidad: string,
): RegistroComunidad | undefined {
  return informe?.comunidades.find((r) => r.comunidad_autonoma === comunidad);
}

interface ParametrosDato {
  anio: number;
  trimestre: number;
  comunidad: string;
  tasaActual: number;
  tasaNacional: number;
  resumenNota: string;
  historicos: InformeTrimestral[];
  edictosRepresentativos?: EvidenciaEdicto[];
  serieAnual?: PuntoAnual[];
  indicadores?: TasasIndicadores;
  indicadoresNacional?: TasasIndicadores;
}

export function construirDatoTrimestral({
  anio,
  trimestre,
  comunidad,
  tasaActual,
  tasaNacional,
  resumenNota,
  historicos,
  edictosRepresentativos,
  serieAnual,
  indicadores,
  indicadoresNacional,
}: ParametrosDato): DatoTrimestral {
  const anterior = trimestreAnterior(anio, trimestre);
  const informeAnterior = historicos.find(
    (i) => i.anio === anterior.anio && i.trimestre === anterior.trimestre,
  );
  const registroAnterior = buscarRegistro(informeAnterior, comunidad);

  const informeInteranual = historicos.find((i) => i.anio === anio - 1 && i.trimestre === trimestre);
  const registroInteranual = buscarRegistro(informeInteranual, comunidad);

  const serie: PuntoSerie[] = [...historicos]
    .sort((a, b) => ordenTrimestre(a) - ordenTrimestre(b))
    .filter((i) => ordenTrimestre(i) < ordenTrimestre({ anio, trimestre }))
    .slice(-8)
    .map((i) => {
      const registro = buscarRegistro(i, comunidad);
      return {
        anio: i.anio,
        trimestre: i.trimestre,
        tasa_litigiosidad: registro?.tasa_litigiosidad ?? Number.NaN,
      };
    })
    .filter((p) => Number.isFinite(p.tasa_litigiosidad));

  return {
    comunidad_autonoma: comunidad,
    anio,
    trimestre,
    tasa_litigiosidad_actual: tasaActual,
    tasa_litigiosidad_trimestre_anterior: registroAnterior?.tasa_litigiosidad,
    variacion_trimestral_pct:
      registroAnterior !== undefined
        ? redondear(((tasaActual - registroAnterior.tasa_litigiosidad) / registroAnterior.tasa_litigiosidad) * 100)
        : undefined,
    tasa_litigiosidad_media_nacional: tasaNacional,
    variacion_interanual_pct:
      registroInteranual !== undefined
        ? redondear(((tasaActual - registroInteranual.tasa_litigiosidad) / registroInteranual.tasa_litigiosidad) * 100)
        : undefined,
    serie_historica: serie,
    serie_anual: serieAnual?.length ? serieAnual : undefined,
    tasa_resolucion: indicadores?.resolucion,
    tasa_resolucion_anio_anterior: indicadores?.resolucion_anio_anterior,
    tasa_pendencia: indicadores?.pendencia,
    tasa_pendencia_anio_anterior: indicadores?.pendencia_anio_anterior,
    tasa_congestion: indicadores?.congestion,
    tasa_congestion_anio_anterior: indicadores?.congestion_anio_anterior,
    media_nacional_congestion: indicadoresNacional?.congestion,
    media_nacional_pendencia: indicadoresNacional?.pendencia,
    edictos_representativos: edictosRepresentativos?.length ? edictosRepresentativos : undefined,
    resumen_nota_prensa: resumenNota || undefined,
  };
}

export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
