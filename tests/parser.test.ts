import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parseNotaLitigiosidad } from "../lib/litigiosidad/parser";

const URL_NOTA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Notas-de-prensa/nota-de-prueba";
const FIXTURE = new URL("./fixtures/nota-2026T1.html", import.meta.url);

describe("parseNotaLitigiosidad", () => {
  test("extrae periodo, nacional y las 17 comunidades", async () => {
    const html = await readFile(FIXTURE, "utf8");
    const nota = parseNotaLitigiosidad(html, URL_NOTA);

    expect(nota.titulo).toContain("El ingreso de nuevos asuntos");
    expect(nota.anio).toBe(2026);
    expect(nota.trimestre).toBe(1);
    expect(nota.fecha_publicacion).toBe("2026-06-26");
    expect(nota.nacional.tasa_litigiosidad).toBeCloseTo(37.15);
    expect(nota.nacional.tasa_litigiosidad_anio_anterior).toBeCloseTo(47.07);
    expect(nota.nacional.variacion_interanual_pct).toBeCloseTo(-21.07);

    expect(nota.comunidades).toHaveLength(17);
    const porNombre = new Map(nota.comunidades.map((c) => [c.nombre, c.tasa]));
    expect(porNombre.get("Canarias")).toBeCloseTo(45.01);
    expect(porNombre.get("Asturias")).toBeCloseTo(41.73);
    expect(porNombre.get("Madrid")).toBeCloseTo(40.59);
    expect(porNombre.get("Comunidad Valenciana")).toBeCloseTo(35.47);
    expect(porNombre.get("País Vasco")).toBeCloseTo(28.02);

    expect(nota.pdf_url).toMatch(/\.pdf$/);
    expect(nota.resumen).toContain("tasa de litigiosidad");
  });

  test("falla si la nota no contiene las tasas autonómicas", () => {
    expect(() =>
      parseNotaLitigiosidad("<html><body><h1>Otra nota</h1></body></html>", URL_NOTA),
    ).toThrow();
  });

  test("soporta la plantilla de 2025 (valores enteros y 'se situó en')", async () => {
    const html = await readFile(new URL("./fixtures/nota-2025T3.html", import.meta.url), "utf8");
    const nota = parseNotaLitigiosidad(html, URL_NOTA);

    expect(nota.anio).toBe(2025);
    expect(nota.trimestre).toBe(3);
    expect(nota.nacional.tasa_litigiosidad).toBeCloseTo(31.25);
    expect(nota.nacional.tasa_litigiosidad_anio_anterior).toBeCloseTo(35.68);
    expect(nota.comunidades).toHaveLength(17);

    const porNombre = new Map(nota.comunidades.map((c) => [c.nombre, c.tasa]));
    expect(porNombre.get("Canarias")).toBeCloseTo(41.14);
    expect(porNombre.get("Cataluña")).toBeCloseTo(34);
  });

  test("tolera comunidades sin dato publicado (País Vasco (*))", async () => {
    const html = await readFile(new URL("./fixtures/nota-2025T1.html", import.meta.url), "utf8");
    const nota = parseNotaLitigiosidad(html, URL_NOTA);

    expect(nota.anio).toBe(2025);
    expect(nota.trimestre).toBe(1);
    expect(nota.nacional.tasa_litigiosidad).toBeCloseTo(40.07);
    expect(nota.nacional.tasa_litigiosidad_anio_anterior).toBeCloseTo(40.67);
    expect(nota.comunidades_ausentes).toEqual(["País Vasco"]);

    const porNombre = new Map(nota.comunidades.map((c) => [c.nombre, c.tasa]));
    expect(porNombre.get("Canarias")).toBeCloseTo(63.91);
    expect(porNombre.get("Murcia")).toBeCloseTo(45.16);
  });

  test("no confunde el periodo con el año de comparación", async () => {
    const html = await readFile(new URL("./fixtures/nota-2025T2.html", import.meta.url), "utf8");
    const nota = parseNotaLitigiosidad(html, URL_NOTA);

    expect(nota.anio).toBe(2025);
    expect(nota.trimestre).toBe(2);
  });
});
