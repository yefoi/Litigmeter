import { describe, expect, test } from "vitest";
import type { FicheroIndicadores } from "../lib/indicadores/tipos";
import { calcularIndice, indicesDeInforme } from "../lib/litigiosidad/indice";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";

describe("calcularIndice", () => {
  test("normaliza nivel y tendencia y renormaliza pesos sin indicadores", () => {
    const resultado = calcularIndice({
      tasa: 45,
      variacion_interanual_pct: -20,
      contexto: { tasas: [35, 45] },
    });

    expect(resultado.componentes.nivel).toBeCloseTo(1);
    expect(resultado.componentes.tendencia).toBeCloseTo(0);
    expect(resultado.componentes.congestion).toBeUndefined();
    expect(resultado.valor).toBeCloseTo(61.5);
    expect(resultado.pesos_usados).toEqual({ nivel: 0.615, tendencia: 0.385 });
  });

  test("usa congestión y pendencia cuando están disponibles", () => {
    const resultado = calcularIndice({
      tasa: 40,
      variacion_interanual_pct: 0,
      congestion: 4,
      pendencia: 3,
      contexto: { tasas: [30, 50], congestiones: [2, 4], pendencias: [1, 3] },
    });

    expect(resultado.componentes).toEqual({
      nivel: 0.5,
      tendencia: 0.5,
      congestion: 1,
      pendencia: 1,
    });
    expect(resultado.valor).toBeCloseTo(67.5);
  });
});

describe("indicesDeInforme", () => {
  const informe: InformeTrimestral = {
    version_esquema: 1,
    anio: 2026,
    trimestre: 1,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test", titulo: "Nota" },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: 37.15 },
    comunidades: [
      {
        comunidad_autonoma: "Canarias",
        tasa_litigiosidad: 45,
        variacion_interanual_pct: -20,
        posicion_nacional: 1,
      },
      {
        comunidad_autonoma: "Madrid",
        tasa_litigiosidad: 35,
        variacion_interanual_pct: 10,
        posicion_nacional: 2,
      },
    ],
  };

  const indicadores: FicheroIndicadores = {
    version_esquema: 1,
    anio: 2026,
    trimestre: 1,
    fuente: { url: "https://ejemplo.test/ind", titulo: "Indicadores" },
    comunidades: {
      Canarias: { congestion: 4, pendencia: 3 },
      Madrid: { congestion: 2, pendencia: 1 },
    },
  };

  test("calcula el índice de cada comunidad con su contexto", () => {
    const indices = indicesDeInforme(informe, indicadores);

    expect(indices.get("Canarias")?.valor).toBeCloseTo(75);
    expect(indices.get("Madrid")?.valor).toBeCloseTo(18.8);
  });

  test("sin indicadores solo usa nivel y tendencia", () => {
    const indices = indicesDeInforme(informe);

    expect(indices.get("Canarias")?.pesos_usados).toEqual({ nivel: 0.615, tendencia: 0.385 });
  });
});
