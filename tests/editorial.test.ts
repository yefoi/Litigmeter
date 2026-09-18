import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { escribirEditorial, leerEditorial } from "../lib/editorial/ficheros";
import { candidatosEditorial, elegirFoco, redactarEditorial } from "../lib/editorial/redactar";
import type { InformeTrimestral, RegistroComunidad } from "../lib/litigiosidad/tipos";

function registro(
  nombre: string,
  tasa: number,
  opciones: { noticiable?: boolean; gravedad?: number; variacion?: number } = {},
): RegistroComunidad {
  return {
    comunidad_autonoma: nombre,
    tasa_litigiosidad: tasa,
    variacion_interanual_pct: opciones.variacion,
    posicion_nacional: 1,
    clasificacion: {
      tendencia: "empeora",
      gravedad_congestion: opciones.gravedad ?? 3,
      es_noticiable: opciones.noticiable ?? false,
      probabilidad_noticiable: opciones.noticiable ? 0.9 : 0.1,
      modelo: "jev-latest",
    },
  };
}

function informe(): InformeTrimestral {
  return {
    version_esquema: 1,
    anio: 2026,
    trimestre: 1,
    generado_en: new Date(0).toISOString(),
    fuente: { url: "https://ejemplo.test/nota", titulo: "Nota de prueba" },
    resumen_nota: "",
    nacional: { tasa_litigiosidad: 37.15, variacion_interanual_pct: -21.07 },
    comunidades: [
      registro("Canarias", 45.01, { noticiable: true, gravedad: 4, variacion: -29.6 }),
      registro("Madrid", 40.59, { gravedad: 5 }),
      registro("Baleares", 36.9, { noticiable: true, gravedad: 2, variacion: 5.1 }),
      registro("Murcia", 37.41),
    ],
  };
}

describe("candidatosEditorial", () => {
  test("prioriza noticiables y gravedad", () => {
    const lista = candidatosEditorial(informe());

    expect(lista.map((c) => c.comunidad_autonoma)).toEqual([
      "Canarias",
      "Baleares",
      "Madrid",
      "Murcia",
    ]);
  });
});

describe("elegirFoco", () => {
  test("sin API key devuelve el primer candidato", async () => {
    const anterior = process.env.TYPESAFE_AI_API_KEY;
    delete process.env.TYPESAFE_AI_API_KEY;
    try {
      const foco = await elegirFoco(informe(), candidatosEditorial(informe()));
      expect(foco?.comunidad_autonoma).toBe("Canarias");
    } finally {
      if (anterior !== undefined) process.env.TYPESAFE_AI_API_KEY = anterior;
    }
  });
});

describe("redactarEditorial", () => {
  test("compone titular, entradilla, destacados y evidencia", () => {
    const resumen = redactarEditorial(informe(), candidatosEditorial(informe())[0], {
      Canarias: [{ tipo_procedimiento: "civil", resumen: "Juzgado de…" }],
    });

    expect(resumen.titular).toContain("Canarias");
    expect(resumen.titular).toContain("baja un 29,6 %");
    expect(resumen.entradilla).toContain("37,15");
    expect(resumen.destacados.length).toBeGreaterThanOrEqual(2);
    expect(resumen.destacados[0].evidencia).toBe("Juzgado de…");
  });
});

describe("ficheros editoriales", () => {
  test("escribe y lee el trimestre", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-editorial-"));
    try {
      const resumen = redactarEditorial(informe(), candidatosEditorial(informe())[0]);
      await escribirEditorial(dir, resumen);

      const leido = await leerEditorial(dir, 2026, 1);
      expect(leido?.titular).toBe(resumen.titular);
      expect(await leerEditorial(dir, 2025, 4)).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
