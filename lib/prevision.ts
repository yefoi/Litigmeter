import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InformeTrimestral } from "./litigiosidad/tipos";

export const VERSION_PREVISIONES = 1;
export const METODO_PREVISION = "estacional simple con deriva amortiguada";

export interface PrediccionTasa {
  tasa: number;
  metodo: string;
}

export interface PrediccionTrimestre {
  anio: number;
  trimestre: number;
  generado_desde: string;
  comunidades: Record<string, PrediccionTasa>;
  nacional: PrediccionTasa;
}

export interface AciertoComunidad {
  previsto: number;
  real: number;
  error: number;
  error_pct: number;
}

export interface AciertoTrimestre {
  anio: number;
  trimestre: number;
  comunidades: Record<string, AciertoComunidad>;
  error_medio: number;
  dentro_5pct: number;
  total: number;
}

export interface FicheroPrevisiones {
  version_esquema: 1;
  generado_en: string;
  previsiones: PrediccionTrimestre[];
  aciertos: AciertoTrimestre[];
}

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function claveTrimestre(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export function siguienteTrimestre(anio: number, trimestre: number): { anio: number; trimestre: number } {
  return trimestre === 4 ? { anio: anio + 1, trimestre: 1 } : { anio, trimestre: trimestre + 1 };
}

/**
 * Previsión transparente para el trimestre siguiente: estacional simple (mismo
 * trimestre del año anterior) con una deriva amortiguada (la mitad de la
 * variación interanual más reciente). Sin modelos opacos ni caja negra.
 */
export function predecirTrimestre(informes: InformeTrimestral[]): PrediccionTrimestre | undefined {
  const actual = informes.at(-1);
  if (!actual) return undefined;
  const objetivo = siguienteTrimestre(actual.anio, actual.trimestre);
  const mismoTrimestreAnioAnterior = informes.find(
    (informe) => informe.anio === objetivo.anio - 1 && informe.trimestre === objetivo.trimestre,
  );

  const comunidades: Record<string, PrediccionTasa> = {};
  for (const registro of actual.comunidades) {
    const base =
      mismoTrimestreAnioAnterior?.comunidades.find(
        (candidato) => candidato.comunidad_autonoma === registro.comunidad_autonoma,
      )?.tasa_litigiosidad ?? registro.tasa_litigiosidad;
    const deriva = (registro.variacion_interanual_pct ?? 0) / 200;
    comunidades[registro.comunidad_autonoma] = {
      tasa: redondear(base * (1 + deriva)),
      metodo: METODO_PREVISION,
    };
  }

  const baseNacional =
    mismoTrimestreAnioAnterior?.nacional.tasa_litigiosidad ?? actual.nacional.tasa_litigiosidad;
  const derivaNacional = (actual.nacional.variacion_interanual_pct ?? 0) / 200;

  return {
    anio: objetivo.anio,
    trimestre: objetivo.trimestre,
    generado_desde: claveTrimestre(actual.anio, actual.trimestre),
    comunidades,
    nacional: { tasa: redondear(baseNacional * (1 + derivaNacional)), metodo: METODO_PREVISION },
  };
}

export function calcularAciertos(
  informes: InformeTrimestral[],
  previsiones: PrediccionTrimestre[],
): AciertoTrimestre[] {
  const aciertos: AciertoTrimestre[] = [];
  for (const prevision of previsiones) {
    const real = informes.find(
      (informe) => informe.anio === prevision.anio && informe.trimestre === prevision.trimestre,
    );
    if (!real) continue;

    const comunidades: Record<string, AciertoComunidad> = {};
    let sumaErrores = 0;
    let dentroDel5 = 0;
    for (const registro of real.comunidades) {
      const previsto = prevision.comunidades[registro.comunidad_autonoma]?.tasa;
      if (previsto === undefined) continue;
      const error = redondear(registro.tasa_litigiosidad - previsto);
      const errorPct = previsto !== 0 ? redondear((error / previsto) * 100) : 0;
      comunidades[registro.comunidad_autonoma] = {
        previsto,
        real: registro.tasa_litigiosidad,
        error,
        error_pct: errorPct,
      };
      sumaErrores += Math.abs(error);
      if (Math.abs(errorPct) <= 5) dentroDel5++;
    }

    const total = Object.keys(comunidades).length;
    if (total === 0) continue;
    aciertos.push({
      anio: prevision.anio,
      trimestre: prevision.trimestre,
      comunidades,
      error_medio: redondear(sumaErrores / total),
      dentro_5pct: dentroDel5,
      total,
    });
  }
  return aciertos;
}

export function fusionarPrediccion(
  fichero: FicheroPrevisiones,
  prediccion: PrediccionTrimestre,
): FicheroPrevisiones {
  const existe = fichero.previsiones.some(
    (guardada) =>
      guardada.anio === prediccion.anio && guardada.trimestre === prediccion.trimestre,
  );
  return existe
    ? fichero
    : { ...fichero, previsiones: [...fichero.previsiones, prediccion] };
}

export async function leerPrevisiones(
  dataBaseDir: string,
): Promise<FicheroPrevisiones | undefined> {
  try {
    const contenido = await readFile(path.join(dataBaseDir, "previsiones.json"), "utf8");
    const fichero = JSON.parse(contenido) as FicheroPrevisiones;
    if (fichero.version_esquema !== 1 || !Array.isArray(fichero.previsiones)) {
      throw new Error("Formato de previsiones no válido");
    }
    return fichero;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirPrevisiones(
  dataBaseDir: string,
  fichero: FicheroPrevisiones,
): Promise<string> {
  await mkdir(dataBaseDir, { recursive: true });
  const ruta = path.join(dataBaseDir, "previsiones.json");
  await writeFile(ruta, `${JSON.stringify(fichero, null, 2)}\n`, "utf8");
  return ruta;
}
