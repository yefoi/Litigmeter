import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { escribirIndicadores, leerIndicadores } from "../lib/indicadores/ficheros";
import { parsearIndicadoresPdf } from "../lib/indicadores/parser";

const TEXTO_CANARIAS = `2025-1-T 2026-1-T Evolución 2025-1-T 2026-1-T Evolución
Resoluciones 0,83 0,94 12,3% 63,35 45,01 -29,0%
Pendencia 2,27 2,83 24,6%
Congestión 3,28 3,86 17,6%`;

const TEXTO_NACIONAL = `2025-1-T 2026-1-T Evolución 2025-1-T 2026-1-T Evolución
Resolución 0,89 0,96 8,7% 46,6 37,1 -20,3%
Pendencia 2,36 2,71 14,8%
Congestión 3,36 3,70 10,1%`;

describe("parsearIndicadoresPdf", () => {
  test("parsea la plantilla autonómica", () => {
    const tasas = parsearIndicadoresPdf(TEXTO_CANARIAS);

    expect(tasas.resolucion).toBeCloseTo(0.94);
    expect(tasas.resolucion_anio_anterior).toBeCloseTo(0.83);
    expect(tasas.litigiosidad).toBeCloseTo(45.01);
    expect(tasas.litigiosidad_anio_anterior).toBeCloseTo(63.35);
    expect(tasas.pendencia).toBeCloseTo(2.83);
    expect(tasas.pendencia_anio_anterior).toBeCloseTo(2.27);
    expect(tasas.congestion).toBeCloseTo(3.86);
    expect(tasas.congestion_anio_anterior).toBeCloseTo(3.28);
  });

  test("parsea la plantilla nacional (Resolución en singular)", () => {
    const tasas = parsearIndicadoresPdf(TEXTO_NACIONAL);

    expect(tasas.resolucion).toBeCloseTo(0.96);
    expect(tasas.litigiosidad).toBeCloseTo(37.1);
    expect(tasas.congestion).toBeCloseTo(3.7);
  });

  test("falla si no hay ninguna tasa", () => {
    expect(() => parsearIndicadoresPdf("texto sin indicadores")).toThrow();
  });
});

describe("ficheros de indicadores", () => {
  test("escribe y lee el trimestre", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-indicadores-"));
    try {
      await escribirIndicadores(dir, {
        version_esquema: 1,
        anio: 2026,
        trimestre: 1,
        fuente: { url: "https://ejemplo.test", titulo: "Indicadores" },
        comunidades: { Canarias: { congestion: 3.86, pendencia: 2.83 } },
      });

      const leido = await leerIndicadores(dir, 2026, 1);
      expect(leido?.comunidades.Canarias.congestion).toBeCloseTo(3.86);
      expect(await leerIndicadores(dir, 2025, 4)).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
