import { describe, expect, test } from "vitest";
import { construirDatoTrimestral, trimestreAnterior } from "../lib/litigiosidad/historico";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";

function informe(anio: number, trimestre: number, tasas: Record<string, number>): InformeTrimestral {
  return {
    version_esquema: 1,
    anio,
    trimestre,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test/nota", titulo: "Nota de prueba" },
    resumen_nota: "Resumen",
    nacional: { tasa_litigiosidad: 37.15 },
    comunidades: Object.entries(tasas).map(([comunidad_autonoma, tasa], indice) => ({
      comunidad_autonoma,
      tasa_litigiosidad: tasa,
      posicion_nacional: indice + 1,
    })),
  };
}

describe("trimestreAnterior", () => {
  test("retrocede dentro del año y cruza a T4", () => {
    expect(trimestreAnterior(2026, 2)).toEqual({ anio: 2026, trimestre: 1 });
    expect(trimestreAnterior(2026, 1)).toEqual({ anio: 2025, trimestre: 4 });
  });
});

describe("construirDatoTrimestral", () => {
  const historicos = [
    informe(2025, 1, { Canarias: 40 }),
    informe(2025, 4, { Canarias: 42 }),
    informe(2025, 3, { Canarias: 41 }),
  ];

  test("enriquece con trimestre anterior, interanual y serie ordenada", () => {
    const dato = construirDatoTrimestral({
      anio: 2026,
      trimestre: 1,
      comunidad: "Canarias",
      tasaActual: 45.01,
      tasaNacional: 37.15,
      resumenNota: "Resumen",
      historicos,
    });

    expect(dato.tasa_litigiosidad_trimestre_anterior).toBeCloseTo(42);
    expect(dato.variacion_trimestral_pct).toBeCloseTo(7.17);
    expect(dato.variacion_interanual_pct).toBeCloseTo(12.52);
    expect(dato.tasa_litigiosidad_media_nacional).toBeCloseTo(37.15);
    expect(dato.serie_historica.map((p) => `${p.anio}-T${p.trimestre}`)).toEqual([
      "2025-T1",
      "2025-T3",
      "2025-T4",
    ]);
  });

  test("deja los campos opcionales vacíos sin histórico", () => {
    const dato = construirDatoTrimestral({
      anio: 2026,
      trimestre: 1,
      comunidad: "Canarias",
      tasaActual: 45.01,
      tasaNacional: 37.15,
      resumenNota: "",
      historicos: [],
    });

    expect(dato.tasa_litigiosidad_trimestre_anterior).toBeUndefined();
    expect(dato.variacion_interanual_pct).toBeUndefined();
    expect(dato.serie_historica).toEqual([]);
  });
});
