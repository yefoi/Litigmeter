import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { COMUNIDADES, normalizarComunidad } from "../litigiosidad/ccaa";
import type { OrdenJurisdiccional, SerieOrden, SerieOrdenes } from "./tipos";

type Medida = "ingresados" | "resueltos" | "en_tramite";

const MEDIDAS: Record<string, Medida> = {
  ingresados: "ingresados",
  resueltos: "resueltos",
  "en tramite": "en_tramite",
};

const HOJAS: Array<{ hoja: string; orden: OrdenJurisdiccional }> = [
  { hoja: "Serie Civil", orden: "civil" },
  { hoja: "Serie Penal", orden: "penal" },
  { hoja: "Serie Contencioso", orden: "contencioso" },
  { hoja: "Serie Social", orden: "social" },
];

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function valorSimple(valor: ExcelJS.CellValue): string | number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number" || typeof valor === "string") return valor;
  if (typeof valor === "object") {
    if ("result" in valor) {
      const resultado = (valor as { result?: ExcelJS.CellValue }).result;
      return resultado === undefined ? null : valorSimple(resultado);
    }
    if ("richText" in valor) {
      return (valor as ExcelJS.CellRichTextValue).richText
        .map((parte) => parte.text)
        .join("");
    }
  }
  return null;
}

function filaDeAnios(hoja: ExcelJS.Worksheet, fila: number): number[] {
  const anios: number[] = [];
  for (let columna = 3; columna <= hoja.columnCount; columna++) {
    const valor = valorSimple(hoja.getCell(fila, columna).value);
    const numero =
      typeof valor === "number"
        ? valor
        : typeof valor === "string" && /^\d{4}$/.test(valor.trim())
          ? Number(valor.trim())
          : undefined;
    if (numero !== undefined && numero >= 1900 && numero <= 2100) anios.push(numero);
  }
  return anios;
}

function filaDeValores(
  hoja: ExcelJS.Worksheet,
  fila: number,
  total: number,
): (number | null)[] {
  const valores: (number | null)[] = [];
  for (let columna = 3; columna <= 2 + total; columna++) {
    const valor = valorSimple(hoja.getCell(fila, columna).value);
    valores.push(typeof valor === "number" ? valor : null);
  }
  return valores;
}

/**
 * Lee el libro "Series Asuntos" del CGPJ: una hoja por orden jurisdiccional con
 * tres bloques (Ingresados, Resueltos, En trámite), una fila por comunidad y otra
 * para España, con la serie anual 2001-2025.
 */
export async function parsearSeriesOrdenes(
  buffer: Buffer,
  fuente: SerieOrdenes["fuente"],
): Promise<SerieOrdenes> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as Parameters<typeof libro.xlsx.load>[0]);

  let anios: number[] = [];
  const ordenes: SerieOrden[] = [];

  for (const { hoja: nombreHoja, orden } of HOJAS) {
    const hoja = libro.getWorksheet(nombreHoja);
    if (!hoja) throw new Error(`El libro no contiene la hoja "${nombreHoja}"`);

    const porMedida = new Map<Medida, Map<string, (number | null)[]>>();
    const nacional: Partial<Record<Medida, (number | null)[]>> = {};
    let medida: Medida | undefined;

    for (let fila = 1; fila <= hoja.rowCount; fila++) {
      const primera = valorSimple(hoja.getCell(fila, 2).value);
      if (typeof primera !== "string") continue;
      const normalizado = normalizarTexto(primera);

      if (MEDIDAS[normalizado]) {
        medida = MEDIDAS[normalizado];
        const aniosFila = filaDeAnios(hoja, fila);
        if (anios.length === 0 && aniosFila.length > 0) anios = aniosFila;
        porMedida.set(medida, new Map());
        continue;
      }

      if (!medida) continue;
      const valores = filaDeValores(hoja, fila, anios.length);
      if (normalizado === "espana") {
        nacional[medida] = valores;
        continue;
      }
      const comunidad = normalizarComunidad(primera);
      if (comunidad) porMedida.get(medida)?.set(comunidad, valores);
    }

    ordenes.push({
      orden,
      nacional: {
        ingresados: nacional.ingresados ?? anios.map(() => null),
        resueltos: nacional.resueltos ?? anios.map(() => null),
        en_tramite: nacional.en_tramite ?? anios.map(() => null),
      },
      comunidades: COMUNIDADES.map(({ nombre }) => ({
        comunidad_autonoma: nombre,
        ingresados: porMedida.get("ingresados")?.get(nombre) ?? anios.map(() => null),
        resueltos: porMedida.get("resueltos")?.get(nombre) ?? anios.map(() => null),
        en_tramite: porMedida.get("en_tramite")?.get(nombre) ?? anios.map(() => null),
      })),
    });
  }

  if (anios.length === 0) {
    throw new Error("El libro no contiene la cabecera de años");
  }

  return { version_esquema: 1, fuente, anios, ordenes };
}

export async function leerSeriesOrdenes(
  dataBaseDir: string,
): Promise<SerieOrdenes | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "ordenes", "ordenes-anual.json"),
      "utf8",
    );
    const serie = JSON.parse(contenido) as SerieOrdenes;
    if (serie.version_esquema !== 1 || !Array.isArray(serie.ordenes)) {
      throw new Error("Formato de series por orden jurisdiccional no válido");
    }
    return serie;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirSeriesOrdenes(
  dataBaseDir: string,
  serie: SerieOrdenes,
): Promise<string> {
  const directorio = path.join(dataBaseDir, "ordenes");
  await mkdir(directorio, { recursive: true });
  const ruta = path.join(directorio, "ordenes-anual.json");
  await writeFile(ruta, `${JSON.stringify(serie, null, 2)}\n`, "utf8");
  return ruta;
}
