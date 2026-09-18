import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { parsearSeriesAnuales, serieAnualDeComunidad } from "../lib/litigiosidad/series";
import type { SerieAnual } from "../lib/litigiosidad/tipos";

async function escribirLibro(ruta: string): Promise<void> {
  const libro = new ExcelJS.Workbook();
  const anios: Record<string, Array<[string, number]>> = {
    "2024": [
      ["Andalucía", 162.99815498783892],
      ["Illes Balears", 162.11819108793216],
      ["Canarias", 212.51151310059078],
      ["Comunitat Valenciana", 152.5],
      ["España", 154.2],
      ["Ceuta", 99.9],
    ],
    "2025": [
      ["Andalucía", 158.3367348335996],
      ["Illes Balears", 161.63493551410932],
      ["Canarias", 202.8559415744879],
      ["Comunitat Valenciana", 145.76973520096504],
      ["España", 153.73885354494337],
    ],
  };
  for (const [anio, filas] of Object.entries(anios)) {
    const hoja = libro.addWorksheet(anio);
    let fila = 9;
    for (const [nombre, total] of filas) {
      hoja.getCell(fila, 2).value = nombre;
      hoja.getCell(fila, 3).value = total;
      fila++;
    }
  }
  await libro.xlsx.writeFile(ruta);
}

describe("parsearSeriesAnuales", () => {
  test("lee años, nacional, alias y ausencias", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-series-"));
    try {
      const ruta = path.join(dir, "series.xlsx");
      await escribirLibro(ruta);
      const serie = await parsearSeriesAnuales(await readFile(ruta), {
        url: "https://ejemplo.test/series.xlsx",
        titulo: "Series de prueba",
      });

      expect(serie.anios).toEqual([2024, 2025]);
      expect(serie.nacional).toEqual([154.2, 153.74]);

      const canarias = serie.comunidades.find((c) => c.comunidad_autonoma === "Canarias");
      expect(canarias?.valores).toEqual([212.51, 202.86]);

      const baleares = serie.comunidades.find((c) => c.comunidad_autonoma === "Baleares");
      expect(baleares?.valores[1]).toBeCloseTo(161.63);

      const valenciana = serie.comunidades.find(
        (c) => c.comunidad_autonoma === "Comunidad Valenciana",
      );
      expect(valenciana?.valores[0]).toBeCloseTo(152.5);

      const murcia = serie.comunidades.find((c) => c.comunidad_autonoma === "Murcia");
      expect(murcia?.valores).toEqual([null, null]);
      expect(serie.comunidades).toHaveLength(17);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("serieAnualDeComunidad", () => {
  const serie: SerieAnual = {
    version_esquema: 1,
    fuente: { url: "https://ejemplo.test", titulo: "Series de prueba" },
    anios: Array.from({ length: 12 }, (_, indice) => 2001 + indice),
    nacional: [],
    comunidades: [
      {
        comunidad_autonoma: "Canarias",
        valores: Array.from({ length: 12 }, (_, indice) => 100 + indice),
      },
    ],
  };

  test("limita a diez años y respeta el año máximo exclusivo", () => {
    const puntos = serieAnualDeComunidad(serie, "Canarias", 2012);

    expect(puntos).toHaveLength(10);
    expect(puntos[0]).toEqual({ anio: 2002, tasa_litigiosidad: 101 });
    expect(puntos.at(-1)?.anio).toBe(2011);
  });

  test("sin serie para la comunidad devuelve vacío", () => {
    expect(serieAnualDeComunidad(serie, "Murcia")).toEqual([]);
  });
});
