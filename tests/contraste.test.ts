import { describe, expect, test } from "vitest";
import {
  construirEstado,
  evidenciaDe,
  validarAfirmacion,
  VEREDICTOS_VALIDOS,
} from "../lib/contraste";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";

function informe(anio: number, trimestre: number, canarias: number): InformeTrimestral {
  return {
    version_esquema: 1,
    anio,
    trimestre,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test", titulo: "Nota" },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: 37.15, variacion_interanual_pct: -21.07 },
    comunidades: [
      {
        comunidad_autonoma: "Canarias",
        tasa_litigiosidad: canarias,
        variacion_interanual_pct: -29.6,
        posicion_nacional: 1,
      },
    ],
  };
}

describe("validarAfirmacion", () => {
  test("rechaza frases cortas y largas", () => {
    expect(validarAfirmacion("corta")).toContain("corta");
    expect(validarAfirmacion("a".repeat(501))).toContain("500");
    expect(validarAfirmacion("La litigiosidad bajó en Madrid el último trimestre")).toBeUndefined();
  });
});

describe("construirEstado", () => {
  test("incluye los últimos cuatro informes con datos serializables", () => {
    const informes = [1, 2, 3, 4, 5].map((indice) => informe(2025, indice > 4 ? 1 : indice, 40 + indice));
    const estado = construirEstado(informes) as { informes: unknown[] };
    expect(estado.informes).toHaveLength(4);
  });

  test("sin informes devuelve undefined", () => {
    expect(construirEstado([])).toBeUndefined();
  });
});

describe("evidenciaDe", () => {
  const informes = [informe(2026, 1, 45.01)];

  test("resume la media nacional", () => {
    expect(evidenciaDe("Nacional", informes)).toContain("media nacional");
  });

  test("resume una comunidad", () => {
    const texto = evidenciaDe("Canarias", informes);
    expect(texto).toContain("Canarias");
    expect(texto).toContain("45,0");
  });

  test("avisa si no hay datos de la comunidad", () => {
    expect(evidenciaDe("Murcia", informes)).toContain("Sin datos de Murcia");
  });
});

describe("VEREDICTOS_VALIDOS", () => {
  test("incluye los cuatro veredictos", () => {
    expect(VEREDICTOS_VALIDOS).toEqual(["respaldada", "contradicha", "matizable", "sin_datos"]);
  });
});
