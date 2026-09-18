import { describe, expect, test } from "vitest";
import {
  calcularAciertos,
  fusionarPrediccion,
  predecirTrimestre,
  siguienteTrimestre,
  type FicheroPrevisiones,
} from "../lib/prevision";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";

function informe(
  anio: number,
  trimestre: number,
  tasas: Record<string, number>,
  variacion: number,
): InformeTrimestral {
  return {
    version_esquema: 1,
    anio,
    trimestre,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test", titulo: "Nota" },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: 40, variacion_interanual_pct: variacion },
    comunidades: Object.entries(tasas).map(([nombre, tasa], indice) => ({
      comunidad_autonoma: nombre,
      tasa_litigiosidad: tasa,
      variacion_interanual_pct: variacion,
      posicion_nacional: indice + 1,
    })),
  };
}

describe("siguienteTrimestre", () => {
  test("cruza el año en T4", () => {
    expect(siguienteTrimestre(2026, 1)).toEqual({ anio: 2026, trimestre: 2 });
    expect(siguienteTrimestre(2026, 4)).toEqual({ anio: 2027, trimestre: 1 });
  });
});

describe("predecirTrimestre", () => {
  test("usa el mismo trimestre del año anterior con deriva amortiguada", () => {
    const prevision = predecirTrimestre([
      informe(2025, 1, { Canarias: 100 }, -20),
      informe(2025, 2, { Canarias: 95 }, -20),
      informe(2026, 1, { Canarias: 90 }, -10),
    ]);

    expect(prevision?.anio).toBe(2026);
    expect(prevision?.trimestre).toBe(2);
    expect(prevision?.generado_desde).toBe("2026-T1");
    // base 95 (2025-T2) con deriva -10/200 = -0,05 → 90,25
    expect(prevision?.comunidades.Canarias.tasa).toBeCloseTo(90.25);
    expect(prevision?.nacional.tasa).toBeCloseTo(38);
  });

  test("sin mismo trimestre del año anterior usa el valor actual", () => {
    const prevision = predecirTrimestre([informe(2026, 1, { Canarias: 100 }, 0)]);
    expect(prevision?.comunidades.Canarias.tasa).toBeCloseTo(100);
  });
});

describe("calcularAciertos", () => {
  test("compara previsión y dato real", () => {
    const previsiones = [
      {
        anio: 2026,
        trimestre: 1,
        generado_desde: "2025-T4",
        comunidades: {
          Canarias: { tasa: 100, metodo: "test" },
          Madrid: { tasa: 50, metodo: "test" },
        },
        nacional: { tasa: 40, metodo: "test" },
      },
    ];
    const aciertos = calcularAciertos(
      [informe(2026, 1, { Canarias: 90, Madrid: 55 }, 0)],
      previsiones,
    );

    expect(aciertos).toHaveLength(1);
    expect(aciertos[0].comunidades.Canarias.error).toBeCloseTo(-10);
    expect(aciertos[0].comunidades.Canarias.error_pct).toBeCloseTo(-10);
    expect(aciertos[0].comunidades.Madrid.error_pct).toBeCloseTo(10);
    expect(aciertos[0].error_medio).toBeCloseTo(7.5);
    expect(aciertos[0].dentro_5pct).toBe(0);
    expect(aciertos[0].total).toBe(2);
  });

  test("ignora previsiones sin dato real", () => {
    const aciertos = calcularAciertos([informe(2026, 1, { Canarias: 90 }, 0)], [
      {
        anio: 2026,
        trimestre: 4,
        generado_desde: "2026-T3",
        comunidades: { Canarias: { tasa: 100, metodo: "test" } },
        nacional: { tasa: 40, metodo: "test" },
      },
    ]);
    expect(aciertos).toEqual([]);
  });
});

describe("fusionarPrediccion", () => {
  const base: FicheroPrevisiones = {
    version_esquema: 1,
    generado_en: new Date(0).toISOString(),
    previsiones: [],
    aciertos: [],
  };

  test("no duplica predicciones del mismo trimestre", () => {
    const prediccion = {
      anio: 2026,
      trimestre: 2,
      generado_desde: "2026-T1",
      comunidades: { Canarias: { tasa: 90, metodo: "test" } },
      nacional: { tasa: 38, metodo: "test" },
    };
    const una = fusionarPrediccion(base, prediccion);
    const dos = fusionarPrediccion(una, { ...prediccion, comunidades: {} });
    expect(dos.previsiones).toHaveLength(1);
  });
});
