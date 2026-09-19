import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { normalizarProvincia } from "../lib/litigiosidad/provincias";
import {
  parsearSeriesProvincias,
  puntosDeProvincia,
} from "../lib/litigiosidad/series-provincias";

async function escribirLibro(ruta: string): Promise<void> {
  const libro = new ExcelJS.Workbook();
  const anios: Record<string, Array<[string, number]>> = {
    "2024": [
      ["Balears, Illes", 150.5],
      ["Coruña, A", 120.25],
      ["Palmas, Las", 200],
      ["Ceuta", 90],
      ["España", 140.4],
    ],
    "2025": [
      ["Balears, Illes", 156.397],
      ["Coruña, A", 124.69],
      ["Palmas, Las", 208.65],
      ["Ceuta", 192.07],
      ["España", 155.3],
    ],
  };
  for (const [anio, filas] of Object.entries(anios)) {
    const hoja = libro.addWorksheet(anio);
    let fila = 10;
    for (const [nombre, total] of filas) {
      hoja.getCell(fila, 2).value = nombre;
      hoja.getCell(fila, 3).value = total;
      fila++;
    }
  }
  await libro.xlsx.writeFile(ruta);
}

describe("normalizarProvincia", () => {
  test("entiende las formas del CGPJ y del BOE", () => {
    expect(normalizarProvincia("Balears, Illes")?.nombre).toBe("Baleares");
    expect(normalizarProvincia("Coruña, A")?.nombre).toBe("A Coruña");
    expect(normalizarProvincia("Palmas, Las")?.nombre).toBe("Las Palmas");
    expect(normalizarProvincia("Alicante/Alacant")?.comunidad_autonoma).toBe(
      "Comunidad Valenciana",
    );
    expect(normalizarProvincia("Ceuta")?.comunidad_autonoma).toBeUndefined();
  });
});

describe("parsearSeriesProvincias", () => {
  test("lee años, nacional y provincias con su comunidad", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-provincias-"));
    try {
      const ruta = path.join(dir, "series.xlsx");
      await escribirLibro(ruta);
      const serie = await parsearSeriesProvincias(await readFile(ruta), {
        url: "https://ejemplo.test/series.xlsx",
        titulo: "Series de prueba",
      });

      expect(serie.anios).toEqual([2024, 2025]);
      expect(serie.nacional).toEqual([140.4, 155.3]);
      expect(serie.provincias).toHaveLength(52);

      const baleares = serie.provincias.find((provincia) => provincia.provincia === "Baleares");
      expect(baleares?.valores[0]).toBeCloseTo(150.5);
      expect(baleares?.valores[1]).toBeCloseTo(156.4);
      expect(baleares?.comunidad_autonoma).toBe("Baleares");

      const coruna = serie.provincias.find((provincia) => provincia.provincia === "A Coruña");
      expect(coruna?.valores[1]).toBeCloseTo(124.69);
      expect(coruna?.comunidad_autonoma).toBe("Galicia");

      const ceuta = serie.provincias.find((provincia) => provincia.provincia === "Ceuta");
      expect(ceuta?.comunidad_autonoma).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("puntosDeProvincia", () => {
  test("devuelve la serie de la provincia pedida", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-provincias-"));
    try {
      const ruta = path.join(dir, "series.xlsx");
      await escribirLibro(ruta);
      const serie = await parsearSeriesProvincias(await readFile(ruta), {
        url: "https://ejemplo.test/series.xlsx",
        titulo: "Series de prueba",
      });

      expect(puntosDeProvincia(serie, "Las Palmas")).toEqual([
        { anio: 2024, tasa_litigiosidad: 200 },
        { anio: 2025, tasa_litigiosidad: 208.65 },
      ]);
      expect(puntosDeProvincia(serie, "Provincia inventada")).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
