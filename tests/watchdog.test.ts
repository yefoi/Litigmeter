import { describe, expect, test } from "vitest";
import { esPosteriorOIgual, trimestreEsperado } from "../lib/watchdog";

function fecha(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

describe("trimestreEsperado", () => {
  test("antes de la ventana de publicación espera el trimestre anterior", () => {
    expect(trimestreEsperado(fecha("2026-06-01"))).toMatchObject({ anio: 2025, trimestre: 4 });
    expect(trimestreEsperado(fecha("2026-07-01"))).toMatchObject({ anio: 2025, trimestre: 4 });
  });

  test("tras los días de gracia espera el trimestre publicado", () => {
    expect(trimestreEsperado(fecha("2026-07-10"))).toMatchObject({ anio: 2026, trimestre: 1 });
    expect(trimestreEsperado(fecha("2026-10-31"))).toMatchObject({ anio: 2026, trimestre: 2 });
    expect(trimestreEsperado(fecha("2027-01-05"))).toMatchObject({ anio: 2026, trimestre: 3 });
    expect(trimestreEsperado(fecha("2027-04-10"))).toMatchObject({ anio: 2026, trimestre: 4 });
  });
});

describe("esPosteriorOIgual", () => {
  test("compara año y trimestre", () => {
    expect(esPosteriorOIgual({ anio: 2026, trimestre: 1 }, { anio: 2025, trimestre: 4 })).toBe(true);
    expect(esPosteriorOIgual({ anio: 2026, trimestre: 1 }, { anio: 2026, trimestre: 1 })).toBe(true);
    expect(esPosteriorOIgual({ anio: 2026, trimestre: 1 }, { anio: 2026, trimestre: 2 })).toBe(false);
  });
});
