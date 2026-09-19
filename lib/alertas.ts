import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { umbralNoticiable } from "./litigiosidad/noticiabilidad";
import type { InformeTrimestral } from "./litigiosidad/tipos";

export type TipoAlerta =
  | "noticiable"
  | "cambio_tendencia"
  | "salto_interanual"
  | "extremo_serie"
  | "diferencial_nacional";

export type SeveridadAlerta = "alta" | "media" | "baja";

export interface Alerta {
  comunidad_autonoma: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  detalle: string;
}

export interface FicheroAlertas {
  version_esquema: 1;
  anio: number;
  trimestre: number;
  generado_en: string;
  alertas: Alerta[];
}

const ORDEN_SEVERIDAD: Record<SeveridadAlerta, number> = { alta: 0, media: 1, baja: 2 };

function numero(valor: number, decimales = 1): string {
  return valor.toFixed(decimales).replace(".", ",");
}

export function calcularAlertas(
  informes: InformeTrimestral[],
  umbral = umbralNoticiable(),
): Alerta[] {
  const ultimo = informes.at(-1);
  if (!ultimo) return [];
  const anterior = informes.at(-2);
  const alertas: Alerta[] = [];

  for (const registro of ultimo.comunidades) {
    const comunidad = registro.comunidad_autonoma;
    const clasificacion = registro.clasificacion;

    if (clasificacion?.es_noticiable) {
      alertas.push({
        comunidad_autonoma: comunidad,
        tipo: "noticiable",
        severidad: clasificacion.probabilidad_noticiable >= 0.9 ? "alta" : "media",
        detalle:
          `la IA la marca como noticiable (P(true) = ` +
          `${(clasificacion.probabilidad_noticiable * 100).toFixed(0)} %, umbral ${umbral})`,
      });
    }

    const tendenciaAnterior = anterior?.comunidades.find(
      (candidato) => candidato.comunidad_autonoma === comunidad,
    )?.clasificacion?.tendencia;
    if (clasificacion && tendenciaAnterior && tendenciaAnterior !== clasificacion.tendencia) {
      alertas.push({
        comunidad_autonoma: comunidad,
        tipo: "cambio_tendencia",
        severidad: clasificacion.tendencia === "empeora" ? "alta" : "media",
        detalle: `pasa de ${tendenciaAnterior} a ${clasificacion.tendencia}`,
      });
    }

    const variacion = registro.variacion_interanual_pct;
    if (variacion !== undefined && Math.abs(variacion) >= 15) {
      alertas.push({
        comunidad_autonoma: comunidad,
        tipo: "salto_interanual",
        severidad: Math.abs(variacion) >= 25 ? "alta" : "media",
        detalle: `variación interanual de ${variacion > 0 ? "+" : ""}${numero(variacion)} %`,
      });
    }

    const serie = informes
      .map(
        (informe) =>
          informe.comunidades.find(
            (candidato) => candidato.comunidad_autonoma === comunidad,
          )?.tasa_litigiosidad,
      )
      .filter((valor): valor is number => typeof valor === "number");
    if (serie.length >= 4) {
      const maximo = Math.max(...serie);
      const minimo = Math.min(...serie);
      if (registro.tasa_litigiosidad === maximo) {
        alertas.push({
          comunidad_autonoma: comunidad,
          tipo: "extremo_serie",
          severidad: "media",
          detalle: `máximo de la serie disponible (${serie.length} trimestres)`,
        });
      } else if (registro.tasa_litigiosidad === minimo) {
        alertas.push({
          comunidad_autonoma: comunidad,
          tipo: "extremo_serie",
          severidad: "baja",
          detalle: `mínimo de la serie disponible (${serie.length} trimestres)`,
        });
      }
    }

    const diferencial = registro.diferencial_vs_nacional;
    if (diferencial !== undefined && Math.abs(diferencial) >= 5) {
      alertas.push({
        comunidad_autonoma: comunidad,
        tipo: "diferencial_nacional",
        severidad: Math.abs(diferencial) >= 8 ? "media" : "baja",
        detalle: `${diferencial > 0 ? "+" : ""}${numero(diferencial)} puntos frente a la media nacional`,
      });
    }
  }

  return alertas.sort(
    (a, b) =>
      ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad] ||
      a.comunidad_autonoma.localeCompare(b.comunidad_autonoma, "es"),
  );
}

export async function leerAlertas(dataBaseDir: string): Promise<FicheroAlertas | undefined> {
  try {
    const contenido = await readFile(path.join(dataBaseDir, "alertas.json"), "utf8");
    const fichero = JSON.parse(contenido) as FicheroAlertas;
    if (fichero.version_esquema !== 1 || !Array.isArray(fichero.alertas)) {
      throw new Error("Formato de alertas no válido");
    }
    return fichero;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirAlertas(
  dataBaseDir: string,
  fichero: FicheroAlertas,
): Promise<string> {
  await mkdir(dataBaseDir, { recursive: true });
  const ruta = path.join(dataBaseDir, "alertas.json");
  await writeFile(ruta, `${JSON.stringify(fichero, null, 2)}\n`, "utf8");
  return ruta;
}
