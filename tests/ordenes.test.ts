import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parsearSeriesOrdenes } from "../lib/ordenes/series";

const FIXTURE = new URL("./fixtures/series-asuntos.xlsx", import.meta.url);
const FUENTE = { url: "https://ejemplo.test/series-asuntos.xlsx", titulo: "Series Asuntos" };

describe("parsearSeriesOrdenes", () => {
  test("extrae ingresados, resueltos y en trámite por orden y comunidad", async () => {
    const buffer = await readFile(FIXTURE);
    const serie = await parsearSeriesOrdenes(buffer, FUENTE);

    expect(serie.anios[0]).toBe(2001);
    expect(serie.anios.at(-1)).toBe(2025);
    expect(serie.ordenes.map((orden) => orden.orden)).toEqual([
      "civil",
      "penal",
      "contencioso",
      "social",
    ]);

    const indice = serie.anios.length - 1;
    const civil = serie.ordenes.find((orden) => orden.orden === "civil")!;
    expect(civil.nacional.ingresados[0]).toBe(892965);
    expect(civil.nacional.ingresados[indice]).toBe(3287980);
    expect(civil.nacional.resueltos[indice]).toBe(3308215);
    expect(civil.nacional.en_tramite[indice]).toBe(2672464);
    expect(civil.comunidades).toHaveLength(17);
    const andalucia = civil.comunidades.find(
      (comunidad) => comunidad.comunidad_autonoma === "Andalucía",
    )!;
    expect(andalucia.ingresados[indice]).toBe(545702);
    expect(andalucia.resueltos[indice]).toBe(564746);
    expect(andalucia.en_tramite[indice]).toBe(461486);

    const penal = serie.ordenes.find((orden) => orden.orden === "penal")!;
    expect(penal.nacional.ingresados[indice]).toBe(3550118);
    const contencioso = serie.ordenes.find((orden) => orden.orden === "contencioso")!;
    expect(contencioso.nacional.ingresados[indice]).toBe(198961);
    const social = serie.ordenes.find((orden) => orden.orden === "social")!;
    expect(social.nacional.ingresados[indice]).toBe(513628);

    const baleares = social.comunidades.find(
      (comunidad) => comunidad.comunidad_autonoma === "Baleares",
    )!;
    expect(baleares.ingresados.at(-1)).not.toBeNull();
  });
});
