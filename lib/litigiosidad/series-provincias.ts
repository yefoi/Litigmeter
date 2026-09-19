import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { PROVINCIAS, normalizarProvincia } from "./provincias";
import type { PuntoAnual, SerieProvincias } from "./tipos";

const NOMBRE_NACIONAL = "españa";

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Lee el libro "Series Tasa de Litigiosidad por Provincias" del CGPJ: una hoja
 * por año con la tasa TOTAL por provincia y una fila España.
 */
export async function parsearSeriesProvincias(
  buffer: Buffer,
  fuente: SerieProvincias["fuente"],
): Promise<SerieProvincias> {
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
      const provincia = normalizarProvincia(nombreCrudo);
      if (provincia) valores.set(provincia.nombre, redondear(total));
    }
    if (valores.size > 0) porAnio.set(anio, valores);
  }

  const anios = [...porAnio.keys()].sort((a, b) => a - b);
  if (anios.length === 0) {
    throw new Error("El libro no contiene hojas anuales con tasas por provincia");
  }

  return {
    version_esquema: 1,
    fuente,
    anios,
    nacional: anios.map((anio) => nacional.get(anio) ?? null),
    provincias: PROVINCIAS.map((provincia) => ({
      provincia: provincia.nombre,
      comunidad_autonoma: provincia.comunidad_autonoma,
      valores: anios.map((anio) => porAnio.get(anio)?.get(provincia.nombre) ?? null),
    })),
  };
}

export async function leerSeriesProvincias(
  dataBaseDir: string,
): Promise<SerieProvincias | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "anual", "litigiosidad-provincias.json"),
      "utf8",
    );
    const serie = JSON.parse(contenido) as SerieProvincias;
    if (serie.version_esquema !== 1 || !Array.isArray(serie.anios)) {
      throw new Error("Formato de series por provincia no válido");
    }
    return serie;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function puntosDeProvincia(
  serie: SerieProvincias,
  provincia: string,
): PuntoAnual[] {
  const fila = serie.provincias.find((candidata) => candidata.provincia === provincia);
  if (!fila) return [];
  const puntos: PuntoAnual[] = [];
  serie.anios.forEach((anio, indice) => {
    const valor = fila.valores[indice];
    if (typeof valor === "number") puntos.push({ anio, tasa_litigiosidad: valor });
  });
  return puntos;
}
