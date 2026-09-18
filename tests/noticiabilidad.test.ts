import { describe, expect, test } from "vitest";
import {
  UMBRAL_NOTICIABLE_POR_DEFECTO,
  contarPorUmbral,
  esNoticiable,
  umbralNoticiable,
} from "../lib/litigiosidad/noticiabilidad";

describe("umbralNoticiable", () => {
  test("usa el valor por defecto sin variable de entorno", () => {
    const anterior = process.env.UMBRAL_NOTICIABLE;
    delete process.env.UMBRAL_NOTICIABLE;
    try {
      expect(umbralNoticiable()).toBe(UMBRAL_NOTICIABLE_POR_DEFECTO);
    } finally {
      if (anterior !== undefined) process.env.UMBRAL_NOTICIABLE = anterior;
    }
  });

  test("lee la variable con coma o punto y descarta valores inválidos", () => {
    const anterior = process.env.UMBRAL_NOTICIABLE;
    try {
      process.env.UMBRAL_NOTICIABLE = "0,8";
      expect(umbralNoticiable()).toBeCloseTo(0.8);
      process.env.UMBRAL_NOTICIABLE = "2";
      expect(umbralNoticiable()).toBe(UMBRAL_NOTICIABLE_POR_DEFECTO);
      process.env.UMBRAL_NOTICIABLE = "alto";
      expect(umbralNoticiable()).toBe(UMBRAL_NOTICIABLE_POR_DEFECTO);
    } finally {
      if (anterior === undefined) delete process.env.UMBRAL_NOTICIABLE;
      else process.env.UMBRAL_NOTICIABLE = anterior;
    }
  });
});

describe("esNoticiable", () => {
  test("compara en estricto con el umbral", () => {
    expect(esNoticiable(0.8, 0.75)).toBe(true);
    expect(esNoticiable(0.75, 0.75)).toBe(false);
    expect(esNoticiable(0.5, 0.75)).toBe(false);
  });
});

describe("contarPorUmbral", () => {
  test("cuenta noticiables para cada umbral", () => {
    expect(contarPorUmbral([0.9, 0.8, 0.7, 0.6], [0.6, 0.75, 0.9])).toEqual([
      { umbral: 0.6, noticiables: 3, total: 4 },
      { umbral: 0.75, noticiables: 2, total: 4 },
      { umbral: 0.9, noticiables: 0, total: 4 },
    ]);
  });
});
