import { describe, expect, test } from "vitest";
import { construirRss, construirRssComunidad } from "../lib/litigiosidad/feed";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";

function informe(): InformeTrimestral {
  return {
    version_esquema: 1,
    anio: 2026,
    trimestre: 1,
    generado_en: new Date(0).toISOString(),
    fuente: {
      url: "https://ejemplo.test/nota?a=1&b=2",
      titulo: "Nota de prueba",
      fecha_publicacion: "2026-06-26",
    },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: 37.15, variacion_interanual_pct: -21.07 },
    comunidades: [
      { comunidad_autonoma: "Canarias", tasa_litigiosidad: 45.01, posicion_nacional: 1 },
      { comunidad_autonoma: "Madrid", tasa_litigiosidad: 40.59, posicion_nacional: 2 },
      { comunidad_autonoma: "Asturias", tasa_litigiosidad: 41.73, posicion_nacional: 3 },
    ],
  };
}

describe("construirRss", () => {
  test("genera un feed con los trimestres y escapa el XML", () => {
    const xml = construirRss([informe()], "https://ejemplo.test");

    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain("Litigiosidad T1 26");
    expect(xml).toContain("https://ejemplo.test/nota?a=1&amp;b=2");
    expect(xml).toContain("Canarias 45,0");
    expect(xml).toContain("<pubDate>");
  });

  test("sin informes genera un canal vacío", () => {
    const xml = construirRss([], "https://ejemplo.test");

    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });
});

describe("construirRssComunidad", () => {
  test("genera el feed de una comunidad", () => {
    const xml = construirRssComunidad([informe()], "Canarias", "canarias", "https://ejemplo.test");

    expect(xml).toContain("Litigmeter · Canarias");
    expect(xml).toContain("https://ejemplo.test/ccaa/canarias");
    expect(xml).toContain("Canarias · T1 26");
    expect(xml).toContain("<item>");
  });
});
