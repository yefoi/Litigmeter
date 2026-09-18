import { describe, expect, test } from "vitest";
import {
  claveMuestra,
  leerEtiquetasCsv,
  mejorUmbral,
  metricasPorUmbral,
} from "../lib/calibracion/metricas";

describe("metricasPorUmbral", () => {
  test("calcula tp/fp/tn/fn y métricas", () => {
    const muestras = [
      { probabilidad: 0.9, etiqueta: true },
      { probabilidad: 0.8, etiqueta: false },
      { probabilidad: 0.7, etiqueta: true },
      { probabilidad: 0.6, etiqueta: true },
      { probabilidad: 0.4, etiqueta: false },
    ];
    const metricas = metricasPorUmbral(muestras, 0.75);

    expect(metricas).toMatchObject({ tp: 1, fp: 1, tn: 1, fn: 2 });
    expect(metricas.precision).toBeCloseTo(0.5);
    expect(metricas.recall).toBeCloseTo(1 / 3);
    expect(metricas.f1).toBeCloseTo(0.4);
    expect(metricas.exactitud).toBeCloseTo(0.4);
  });
});

describe("mejorUmbral", () => {
  test("elige el mayor F1", () => {
    const muestras = [
      { probabilidad: 0.95, etiqueta: true },
      { probabilidad: 0.55, etiqueta: true },
      { probabilidad: 0.45, etiqueta: false },
      { probabilidad: 0.35, etiqueta: false },
    ];
    const mejor = mejorUmbral(muestras, [0.4, 0.5, 0.9]);

    expect(mejor?.umbral).toBe(0.5);
    expect(mejor?.f1).toBeCloseTo(1);
  });

  test("sin muestras devuelve undefined", () => {
    expect(mejorUmbral([])).toBeUndefined();
  });
});

describe("leerEtiquetasCsv", () => {
  test("lee etiquetas 1/0 y sí/no y omite vacías", () => {
    const csv = [
      "etiqueta_humana,anio,trimestre,comunidad_autonoma,probabilidad_noticiable",
      "1,2026,1,Canarias,0.9",
      "sí,2025,3,Madrid,0.7",
      "0,2025,2,Galicia,0.8",
      ",2025,1,Murcia,0.6",
    ].join("\n");
    const etiquetas = leerEtiquetasCsv(csv);

    expect(etiquetas.get(claveMuestra(2026, 1, "Canarias"))).toBe(true);
    expect(etiquetas.get(claveMuestra(2025, 3, "Madrid"))).toBe(true);
    expect(etiquetas.get(claveMuestra(2025, 2, "Galicia"))).toBe(false);
    expect(etiquetas.has(claveMuestra(2025, 1, "Murcia"))).toBe(false);
  });

  test("sin cabecera válida devuelve vacío", () => {
    expect(leerEtiquetasCsv("a,b,c\n1,2,3")).toEqual(new Map());
  });
});
