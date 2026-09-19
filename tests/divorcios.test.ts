import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parsearNotaDivorcios } from "../lib/divorcios/parser";

const FIXTURE = new URL("./fixtures/nota-divorcios-2026T1.html", import.meta.url);
const URL_NOTA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Consejo-General-del-Poder-Judicial/Oficina-de-Comunicacion/Archivo-de-notas-de-prensa/disolucion-matrimonial";

describe("parsearNotaDivorcios", () => {
  test("extrae el nacional y las tasas por comunidad", async () => {
    const html = await readFile(FIXTURE, "utf8");
    const informe = parsearNotaDivorcios(html, URL_NOTA);

    expect(informe.anio).toBe(2026);
    expect(informe.trimestre).toBe(1);
    expect(informe.fuente.fecha_publicacion).toBe("2026-06-24");

    expect(informe.nacional.total).toBe(20832);
    expect(informe.nacional.variacion_interanual_pct).toBeCloseTo(-14.1);
    expect(informe.nacional.tasa_media_por_100000).toBeCloseTo(42.4);
    expect(informe.nacional.divorcios_no_consensuados?.total).toBe(6904);
    expect(informe.nacional.divorcios_no_consensuados?.variacion_interanual_pct).toBeCloseTo(-26.9);
    expect(informe.nacional.divorcios_consensuados?.total).toBe(13186);
    expect(informe.nacional.divorcios_consensuados?.variacion_interanual_pct).toBeCloseTo(-5.5);
    expect(informe.nacional.separaciones_no_consensuadas?.total).toBe(177);
    expect(informe.nacional.separaciones_no_consensuadas?.variacion_interanual_pct).toBeCloseTo(
      -30.3,
    );
    expect(informe.nacional.separaciones_consensuadas?.total).toBe(549);
    expect(informe.nacional.separaciones_consensuadas?.variacion_interanual_pct).toBeCloseTo(-3.5);
    expect(informe.nacional.nulidades?.total).toBe(16);
    expect(informe.nacional.nulidades?.variacion_interanual_pct).toBeCloseTo(-15.8);
    expect(informe.nacional.modificacion_medidas_consensuadas?.total).toBe(3656);
    expect(informe.nacional.modificacion_medidas_consensuadas?.variacion_interanual_pct).toBeCloseTo(
      2,
    );
    expect(informe.nacional.modificacion_medidas_no_consensuadas?.total).toBe(6380);
    expect(
      informe.nacional.modificacion_medidas_no_consensuadas?.variacion_interanual_pct,
    ).toBeCloseTo(-26.6);
    expect(informe.nacional.guarda_custodia_consensuadas?.total).toBe(5877);
    expect(informe.nacional.guarda_custodia_consensuadas?.variacion_interanual_pct).toBeCloseTo(
      -0.3,
    );
    expect(informe.nacional.guarda_custodia_no_consensuadas?.total).toBe(5646);
    expect(
      informe.nacional.guarda_custodia_no_consensuadas?.variacion_interanual_pct,
    ).toBeCloseTo(-22.7);

    expect(informe.comunidades).toHaveLength(17);
    const porNombre = new Map(
      informe.comunidades.map((comunidad) => [
        comunidad.comunidad_autonoma,
        comunidad.tasa_por_100000,
      ]),
    );
    expect(porNombre.get("Navarra")).toBeCloseTo(52.4);
    expect(porNombre.get("Comunidad Valenciana")).toBeCloseTo(49.6);
    expect(porNombre.get("Baleares")).toBeCloseTo(49.3);
    expect(porNombre.get("Andalucía")).toBeCloseTo(43.8);
    expect(porNombre.get("Castilla y León")).toBeCloseTo(36.1);
    expect(porNombre.get("Canarias")).toBeCloseTo(41.7);
  });
});
