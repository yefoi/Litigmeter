import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { escribirEvidencias, leerEvidencias } from "../lib/edictos/evidencias";
import { redactarDatosPersonales } from "../lib/edictos/privacidad";
import { seleccionarRepresentativos } from "../lib/edictos/seleccionar";
import type { Edicto, EdictoClasificado, TipoProcedimiento } from "../lib/edictos/tipos";

function clasificado(
  tipo: TipoProcedimiento,
  relevancia: number,
  representativo: boolean,
  texto: string,
): EdictoClasificado {
  const edicto: Edicto = {
    organo_judicial: "Juzgado de Primera Instancia nº 3 de Sevilla",
    comunidad_autonoma: "Andalucía",
    fecha_publicacion: "2026-06-20",
    texto,
  };
  return {
    edicto,
    clasificacion: {
      tipo_procedimiento: tipo,
      relevancia_editorial: relevancia,
      es_representativo: representativo,
      probabilidad_representativo: representativo ? 0.9 : 0.2,
      modelo: "jev-latest",
    },
  };
}

describe("redactarDatosPersonales", () => {
  test("enmascara DNI, NIE, CIF, IBAN y nombres", () => {
    const limpio = redactarDatosPersonales(
      "Doña María López Pérez, con DNI 12345678Z, NIE X1234567L, " +
        "CIF B12345678 e IBAN ES9121000418450200051332.",
    );

    expect(limpio).toContain("[identidad]");
    expect(limpio).toContain("[DNI]");
    expect(limpio).toContain("[NIE]");
    expect(limpio).toContain("[CIF]");
    expect(limpio).toContain("[IBAN]");
    expect(limpio).not.toMatch(/\d{8}[A-Z]/);
    expect(limpio).not.toContain("María");
  });
});

describe("seleccionarRepresentativos", () => {
  const edictos = [
    clasificado("civil", 3.8, true, "Doña Ana Ruiz, procedimiento de desahucio."),
    clasificado("civil", 3.9, true, "Concurso de acreedores de la mercantil X."),
    clasificado("penal", 3.2, true, "Citación a juicio oral. Doña Ana Ruiz, DNI 11111111H."),
    clasificado("social", 4.5, false, "Despido improcedente."),
  ];

  test("filtra, ordena, deduplica por tipo y limita", () => {
    const seleccion = seleccionarRepresentativos(edictos, 2);

    expect(seleccion.map((evidencia) => evidencia.tipo_procedimiento)).toEqual([
      "civil",
      "penal",
    ]);
    expect(seleccion[0].resumen).toContain("Concurso");
  });

  test("solo devuelve tipo y resumen saneados", () => {
    const seleccion = seleccionarRepresentativos(edictos, 2);

    for (const evidencia of seleccion) {
      expect(Object.keys(evidencia).sort()).toEqual(["resumen", "tipo_procedimiento"]);
      expect(evidencia.resumen).not.toMatch(/\d{8}[A-Z]/);
      expect(evidencia.resumen).not.toContain("Ana");
    }
  });
});

describe("evidencias", () => {
  test("escribe y lee el fichero del trimestre", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-evidencias-"));
    try {
      await escribirEvidencias(dir, {
        version_esquema: 1,
        anio: 2026,
        trimestre: 1,
        comunidades: {
          Canarias: [{ tipo_procedimiento: "civil", resumen: "Juzgado de…" }],
        },
      });

      const leido = await leerEvidencias(dir, 2026, 1);
      expect(leido?.comunidades.Canarias[0].tipo_procedimiento).toBe("civil");
      expect(await leerEvidencias(dir, 2025, 4)).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
