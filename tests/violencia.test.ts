import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parsearNotaViolencia } from "../lib/violencia/parser";

const FIXTURE = new URL("./fixtures/nota-violencia-2026T1.html", import.meta.url);
const URL_NOTA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Notas-de-prensa/violencia-de-genero";

describe("parsearNotaViolencia", () => {
  test("extrae métricas nacionales y la tasa por comunidad", async () => {
    const html = await readFile(FIXTURE, "utf8");
    const informe = parsearNotaViolencia(html, URL_NOTA);

    expect(informe.anio).toBe(2026);
    expect(informe.trimestre).toBe(1);
    expect(informe.fuente.fecha_publicacion).toBe("2026-06-29");

    expect(informe.nacional.denuncias).toBe(50911);
    expect(informe.nacional.denuncias_variacion_interanual_pct).toBeCloseTo(6.36);
    expect(informe.nacional.mujeres_denunciantes).toBe(45220);
    expect(informe.nacional.mujeres_variacion_interanual_pct).toBeCloseTo(3.75);
    expect(informe.nacional.tasa_victimas_por_10000).toBeCloseTo(18.1);
    expect(informe.nacional.tasa_delta_puntos).toBeCloseTo(0.5);
    expect(informe.nacional.renuncias).toBe(5337);
    expect(informe.nacional.renuncias_pct).toBeCloseTo(11.8);
    expect(informe.nacional.ordenes_solicitadas).toBe(10853);
    expect(informe.nacional.ordenes_solicitadas_variacion_pct).toBeCloseTo(-2.5);
    expect(informe.nacional.ordenes_acordadas).toBe(7417);
    expect(informe.nacional.ordenes_acordadas_variacion_pct).toBeCloseTo(-1.8);
    expect(informe.nacional.sentencias).toBe(15474);
    expect(informe.nacional.sentencias_condenatorias_pct).toBeCloseTo(81.78);

    expect(informe.comunidades).toHaveLength(17);
    const porNombre = new Map(
      informe.comunidades.map((comunidad) => [
        comunidad.comunidad_autonoma,
        comunidad.tasa_victimas_por_10000,
      ]),
    );
    expect(porNombre.get("Baleares")).toBeCloseTo(28.7);
    expect(porNombre.get("Castilla y León")).toBeCloseTo(11.4);
    expect(porNombre.get("Cantabria")).toBeCloseTo(14.6);
    expect(porNombre.get("Asturias")).toBeCloseTo(14.6);
  });
});
