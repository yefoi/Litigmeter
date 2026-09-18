import { describe, expect, test } from "vitest";
import { calcularAlertas } from "../lib/alertas";
import type { InformeTrimestral, RegistroComunidad } from "../lib/litigiosidad/tipos";

function registro(
  nombre: string,
  tasa: number,
  opciones: {
    variacion?: number;
    tendencia?: "mejora" | "estable" | "empeora";
    noticiable?: boolean;
    probabilidad?: number;
    diferencial?: number;
  } = {},
): RegistroComunidad {
  return {
    comunidad_autonoma: nombre,
    tasa_litigiosidad: tasa,
    variacion_interanual_pct: opciones.variacion,
    diferencial_vs_nacional: opciones.diferencial,
    posicion_nacional: 1,
    clasificacion: opciones.tendencia
      ? {
          tendencia: opciones.tendencia,
          gravedad_congestion: 3,
          es_noticiable: opciones.noticiable ?? false,
          probabilidad_noticiable: opciones.probabilidad ?? 0.5,
          modelo: "test",
        }
      : undefined,
  };
}

function informe(
  anio: number,
  trimestre: number,
  registros: RegistroComunidad[],
): InformeTrimestral {
  return {
    version_esquema: 1,
    anio,
    trimestre,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test", titulo: "Nota" },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: 37 },
    comunidades: registros,
  };
}

describe("calcularAlertas", () => {
  test("detecta noticiable, cambio de tendencia, salto y diferencial", () => {
    const alertas = calcularAlertas(
      [
        informe(2025, 4, [registro("Canarias", 40, { tendencia: "mejora" })]),
        informe(2026, 1, [
          registro("Canarias", 45, {
            tendencia: "empeora",
            noticiable: true,
            probabilidad: 0.95,
            variacion: -30,
            diferencial: 8,
          }),
        ]),
      ],
      0.75,
    );

    const tipos = alertas.map((alerta) => alerta.tipo);
    expect(tipos).toContain("noticiable");
    expect(tipos).toContain("cambio_tendencia");
    expect(tipos).toContain("salto_interanual");
    expect(tipos).toContain("diferencial_nacional");
    expect(alertas[0].severidad).toBe("alta");
    expect(alertas.every((alerta, indice) =>
      indice === 0 ||
      ["alta", "media", "baja"].indexOf(alertas[indice - 1].severidad) <=
        ["alta", "media", "baja"].indexOf(alerta.severidad),
    )).toBe(true);
  });

  test("marca el máximo de la serie con al menos cuatro trimestres", () => {
    const alertas = calcularAlertas([
      informe(2025, 1, [registro("Canarias", 30)]),
      informe(2025, 2, [registro("Canarias", 35)]),
      informe(2025, 3, [registro("Canarias", 32)]),
      informe(2025, 4, [registro("Canarias", 38)]),
      informe(2026, 1, [registro("Canarias", 45)]),
    ]);

    const extremo = alertas.find((alerta) => alerta.tipo === "extremo_serie");
    expect(extremo?.detalle).toContain("máximo");
  });

  test("sin informes no hay alertas", () => {
    expect(calcularAlertas([])).toEqual([]);
  });
});
