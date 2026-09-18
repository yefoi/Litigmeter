import { describe, expect, test } from "vitest";
import type { FicheroIndicadores } from "../lib/indicadores/tipos";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";
import { reconciliar } from "../lib/reconciliacion";

function informe(
  anio: number,
  trimestre: number,
  canarias: number,
  nacional: number,
): InformeTrimestral {
  return {
    version_esquema: 1,
    anio,
    trimestre,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test/nota", titulo: "Nota" },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: nacional },
    comunidades: [
      { comunidad_autonoma: "Canarias", tasa_litigiosidad: canarias, posicion_nacional: 1 },
    ],
  };
}

const indicadores2026: FicheroIndicadores = {
  version_esquema: 1,
  anio: 2026,
  trimestre: 1,
  fuente: { url: "https://ejemplo.test/ind", titulo: "Indicadores" },
  nacional: { litigiosidad: 37.15, litigiosidad_anio_anterior: 47.07 },
  comunidades: { Canarias: { litigiosidad: 45.01, litigiosidad_anio_anterior: 63.35 } },
};

describe("reconciliar", () => {
  test("detecta diferencias con el año anterior de los indicadores", () => {
    const resultado = reconciliar(
      [informe(2025, 1, 63.91, 40.07), informe(2026, 1, 45.01, 37.15)],
      [indicadores2026],
    );

    const nacional = resultado.discrepancias.find(
      (d) => d.ambito === "Nacional" && d.variable === "tasa_litigiosidad_anio_anterior",
    );
    expect(nacional?.valor_nota).toBeCloseTo(40.07);
    expect(nacional?.valor_indicadores).toBeCloseTo(47.07);
    expect(nacional?.diferencia).toBeCloseTo(-7);

    const canarias = resultado.discrepancias.find((d) => d.ambito === "Canarias");
    expect(canarias?.valor_nota).toBeCloseTo(63.91);
    expect(canarias?.valor_indicadores).toBeCloseTo(63.35);
    expect(canarias?.diferencia).toBeCloseTo(0.56);

    expect(resultado.discrepancias.some((d) => d.anio === 2026)).toBe(false);
  });

  test("sin indicadores no hay discrepancias", () => {
    const resultado = reconciliar([informe(2026, 1, 45.01, 37.15)], []);
    expect(resultado.discrepancias).toEqual([]);
  });
});
