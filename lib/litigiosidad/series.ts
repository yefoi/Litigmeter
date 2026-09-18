import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { COMUNIDADES, normalizarComunidad } from "./ccaa";
import type { PuntoAnual, SerieAnual } from "./tipos";

const NOMBRE_NACIONAL = "españa";
const ULTIMOS_ANIOS = 10;

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Lee el libro "Series Tasa de Litigiosidad por TSJ" del CGPJ: una hoja por año
 * (2001–2025) con TOTAL/CIVIL/PENAL/CONTENCIOSO/SOCIAL por TSJ y una fila España.
 * Devuelve solo la tasa TOTAL, con las CCAA canónicas.
 */
export async function parsearSeriesAnuales(
  buffer: Buffer,
  fuente: SerieAnual["fuente"],
): Promise<SerieAnual> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as Parameters<typeof libro.xlsx.load>[0]);

  const porAnio = new Map<number, Map<string, number>>();
  const nacional = new Map<number, number>();

  for (const hoja of libro.worksheets) {
    if (!/^\d{4}$/.test(hoja.name)) continue;
    const anio = Number(hoja.name);
    const valores = new Map<string, number>();
    for (let fila = 9; fila <= hoja.rowCount; fila++) {
      const nombreCrudo = hoja.getCell(fila, 2).value;
      const total = hoja.getCell(fila, 3).value;
      if (typeof nombreCrudo !== "string" || typeof total !== "number") continue;
      const limpio = nombreCrudo.replace(/\s+/g, " ").trim().toLowerCase();
      if (limpio === NOMBRE_NACIONAL || limpio === "espana") {
        nacional.set(anio, redondear(total));
        continue;
      }
      const comunidad = normalizarComunidad(nombreCrudo);
      if (comunidad) valores.set(comunidad, redondear(total));
    }
    if (valores.size > 0) porAnio.set(anio, valores);
  }

  const anios = [...porAnio.keys()].sort((a, b) => a - b);
  if (anios.length === 0) {
    throw new Error("El libro no contiene hojas anuales con tasas por TSJ");
  }

  return {
    version_esquema: 1,
    fuente,
    anios,
    nacional: anios.map((anio) => nacional.get(anio) ?? null),
    comunidades: COMUNIDADES.map((comunidad) => ({
      comunidad_autonoma: comunidad.nombre,
      valores: anios.map((anio) => porAnio.get(anio)?.get(comunidad.nombre) ?? null),
    })),
  };
}

export async function leerSerieAnual(dataBaseDir: string): Promise<SerieAnual | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "anual", "litigiosidad-anual.json"),
      "utf8",
    );
    const serie = JSON.parse(contenido) as SerieAnual;
    if (serie.version_esquema !== 1 || !Array.isArray(serie.anios)) {
      throw new Error("Formato de serie anual no válido");
    }
    return serie;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function serieAnualDeComunidad(
  serie: SerieAnual,
  comunidad: string,
  anioMaximoExclusivo?: number,
): PuntoAnual[] {
  const fila = serie.comunidades.find((c) => c.comunidad_autonoma === comunidad);
  if (!fila) return [];
  const puntos: PuntoAnual[] = [];
  serie.anios.forEach((anio, indice) => {
    if (anioMaximoExclusivo !== undefined && anio >= anioMaximoExclusivo) return;
    const valor = fila.valores[indice];
    if (typeof valor === "number") puntos.push({ anio, tasa_litigiosidad: valor });
  });
  return puntos.slice(-ULTIMOS_ANIOS);
}
