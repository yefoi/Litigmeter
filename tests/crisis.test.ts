import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parsearNotaCrisis } from "../lib/crisis/parser";
import type { IndicadorCrisis, InformeCrisis } from "../lib/crisis/tipos";

const FIXTURE = new URL("./fixtures/nota-crisis-2026T1.html", import.meta.url);
const URL_NOTA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Consejo-General-del-Poder-Judicial/Oficina-de-Comunicacion/Archivo-de-notas-de-prensa/Todos-los-tipos-de-lanzamientos";

function ranking(informe: InformeCrisis, indicador: IndicadorCrisis, comunidad: string) {
  return informe.rankings.find(
    (entrada) => entrada.indicador === indicador && entrada.comunidad_autonoma === comunidad,
  )?.valor;
}

describe("parsearNotaCrisis", () => {
  test("extrae el nacional y los principales rankings por comunidad", async () => {
    const html = await readFile(FIXTURE, "utf8");
    const informe = parsearNotaCrisis(html, URL_NOTA);

    expect(informe.anio).toBe(2026);
    expect(informe.trimestre).toBe(1);
    expect(informe.fuente.fecha_publicacion).toBe("2026-06-22");

    const { lanzamientos, ejecuciones_hipotecarias, concursos } = informe.nacional;
    expect(lanzamientos.total).toBe(4005);
    expect(lanzamientos.variacion_interanual_pct).toBeCloseTo(-45.4);
    expect(lanzamientos.lau).toBe(2600);
    expect(lanzamientos.lau_pct_del_total).toBeCloseTo(64.9);
    expect(lanzamientos.lau_variacion_interanual_pct).toBeCloseTo(-53.9);
    expect(lanzamientos.hipotecarios_pct_del_total).toBeCloseTo(24.24);
    expect(lanzamientos.hipotecarios_variacion_interanual_pct).toBeCloseTo(-18.3);
    expect(lanzamientos.otras).toBe(434);
    expect(lanzamientos.otras_variacion_interanual_pct).toBeCloseTo(-13.4);
    expect(lanzamientos.solicitados).toBe(16167);
    expect(lanzamientos.solicitados_variacion_interanual_pct).toBeCloseTo(19.2);
    expect(lanzamientos.solicitados_cumplimiento_positivo).toBe(7696);
    expect(lanzamientos.solicitados_cumplimiento_variacion_pct).toBeCloseTo(16.6);

    expect(ejecuciones_hipotecarias.total).toBe(7194);
    expect(ejecuciones_hipotecarias.variacion_interanual_pct).toBeCloseTo(17.5);

    expect(concursos.total).toBe(19100);
    expect(concursos.variacion_interanual_pct).toBeCloseTo(6);
    expect(concursos.personas_juridicas).toBe(1395);
    expect(concursos.personas_juridicas_variacion_interanual_pct).toBeCloseTo(-4.1);
    expect(concursos.naturales_empresarios).toBe(706);
    expect(concursos.naturales_empresarios_variacion_interanual_pct).toBeCloseTo(-3.2);
    expect(concursos.naturales_no_empresarios).toBe(16999);
    expect(concursos.naturales_no_empresarios_variacion_interanual_pct).toBeCloseTo(7.4);
    expect(concursos.declarados).toBe(15316);
    expect(concursos.declarados_variacion_interanual_pct).toBeCloseTo(3.1);
    expect(concursos.fase_convenio).toBe(36);
    expect(concursos.fase_convenio_variacion_pct).toBeCloseTo(-33.3);
    expect(concursos.fase_liquidacion).toBe(1041);
    expect(concursos.fase_liquidacion_variacion_pct).toBeCloseTo(26.5);
    expect(concursos.ere_art169).toBe(86);
    expect(concursos.ere_art169_variacion_pct).toBeCloseTo(-19.6);

    expect(informe.nacional.despidos.total).toBe(42572);
    expect(informe.nacional.despidos.variacion_interanual_pct).toBeCloseTo(3.5);
    expect(informe.nacional.reclamaciones_cantidad.total).toBe(32208);
    expect(informe.nacional.reclamaciones_cantidad.variacion_interanual_pct).toBeCloseTo(-10.9);
    expect(informe.nacional.monitorios.total).toBe(199678);
    expect(informe.nacional.monitorios.variacion_interanual_pct).toBeCloseTo(-59.1);
    expect(informe.nacional.ocupacion_ilegal.total).toBe(460);
    expect(informe.nacional.ocupacion_ilegal.variacion_interanual_pct).toBeCloseTo(-22.3);

    expect(ranking(informe, "lanzamientos", "Cataluña")).toBe(921);
    expect(ranking(informe, "lanzamientos", "Comunidad Valenciana")).toBe(741);
    expect(ranking(informe, "lanzamientos", "Andalucía")).toBe(616);
    expect(ranking(informe, "lanzamientos", "Madrid")).toBe(582);
    expect(ranking(informe, "lanzamientos_lau", "Comunidad Valenciana")).toBe(513);
    expect(ranking(informe, "lanzamientos_hipotecarios", "Cataluña")).toBe(217);
    expect(ranking(informe, "lanzamientos_hipotecarios", "Andalucía")).toBe(208);
    expect(ranking(informe, "ejecuciones_hipotecarias", "Cataluña")).toBe(2616);
    expect(ranking(informe, "concursos", "Cataluña")).toBe(4488);
    expect(ranking(informe, "concursos", "Andalucía")).toBe(3117);
    expect(ranking(informe, "despidos", "Cataluña")).toBe(8886);
    expect(ranking(informe, "reclamaciones_cantidad", "Andalucía")).toBe(6323);
    expect(ranking(informe, "reclamaciones_cantidad", "Madrid")).toBe(5161);
    expect(ranking(informe, "reclamaciones_cantidad", "Cataluña")).toBe(4027);
    expect(ranking(informe, "reclamaciones_cantidad", "Comunidad Valenciana")).toBe(2939);
    expect(ranking(informe, "monitorios", "Andalucía")).toBe(37439);
    expect(ranking(informe, "ocupacion_ilegal", "Andalucía")).toBe(94);
    expect(ranking(informe, "ocupacion_ilegal", "Cataluña")).toBe(88);
    expect(ranking(informe, "ocupacion_ilegal", "Comunidad Valenciana")).toBe(64);
  });

  test("soporta la plantilla anterior (2025-T3)", async () => {
    const html = await readFile(
      new URL("./fixtures/nota-crisis-2025T3.html", import.meta.url),
      "utf8",
    );
    const informe = parsearNotaCrisis(html, URL_NOTA);

    expect(informe.anio).toBe(2025);
    expect(informe.trimestre).toBe(3);
    expect(informe.fuente.fecha_publicacion).toBe("2025-12-12");

    const { lanzamientos, ejecuciones_hipotecarias, concursos } = informe.nacional;
    expect(lanzamientos.total).toBe(5053);
    expect(lanzamientos.variacion_interanual_pct).toBeCloseTo(-4.8);
    expect(lanzamientos.lau).toBe(3743);
    expect(lanzamientos.lau_pct_del_total).toBeCloseTo(74);
    expect(lanzamientos.lau_variacion_interanual_pct).toBeCloseTo(-6.1);
    expect(lanzamientos.hipotecarios_pct_del_total).toBeCloseTo(26);
    expect(lanzamientos.hipotecarios_variacion_interanual_pct).toBeCloseTo(-5.7);
    expect(lanzamientos.otras).toBe(436);
    expect(lanzamientos.otras_variacion_interanual_pct).toBeCloseTo(10.1);
    expect(lanzamientos.solicitados).toBeUndefined();

    expect(ejecuciones_hipotecarias.total).toBe(7444);
    expect(ejecuciones_hipotecarias.variacion_interanual_pct).toBeCloseTo(28.5);

    expect(concursos.total).toBe(17223);
    expect(concursos.variacion_interanual_pct).toBeCloseTo(35.9);
    expect(concursos.personas_juridicas).toBe(1134);
    expect(concursos.personas_juridicas_variacion_interanual_pct).toBeCloseTo(-5.4);
    expect(concursos.naturales_empresarios).toBe(601);
    expect(concursos.naturales_empresarios_variacion_interanual_pct).toBeCloseTo(-6.5);
    expect(concursos.naturales_no_empresarios).toBe(15488);
    expect(concursos.naturales_no_empresarios_variacion_interanual_pct).toBeCloseTo(43);
    expect(concursos.declarados).toBe(12092);
    expect(concursos.declarados_variacion_interanual_pct).toBeCloseTo(22);
    expect(concursos.fase_convenio).toBe(44);
    expect(concursos.fase_convenio_variacion_pct).toBeCloseTo(-2.2);
    expect(concursos.fase_liquidacion).toBe(901);
    expect(concursos.fase_liquidacion_variacion_pct).toBeCloseTo(49.4);
    expect(concursos.ere_art169).toBe(90);
    expect(concursos.ere_art169_variacion_pct).toBeCloseTo(25);

    expect(informe.nacional.despidos.total).toBe(40762);
    expect(informe.nacional.despidos.variacion_interanual_pct).toBeCloseTo(5.7);
    expect(informe.nacional.reclamaciones_cantidad.total).toBe(27928);
    expect(informe.nacional.reclamaciones_cantidad.variacion_interanual_pct).toBeCloseTo(-2.2);
    expect(informe.nacional.monitorios.total).toBe(88567);
    expect(informe.nacional.monitorios.variacion_interanual_pct).toBeCloseTo(-63.7);
    expect(informe.nacional.ocupacion_ilegal.total).toBe(322);
    expect(informe.nacional.ocupacion_ilegal.variacion_interanual_pct).toBeCloseTo(-44.5);

    expect(ranking(informe, "lanzamientos", "Cataluña")).toBe(1293);
    expect(ranking(informe, "lanzamientos", "Andalucía")).toBe(800);
    expect(ranking(informe, "lanzamientos_lau", "Cataluña")).toBe(957);
    expect(ranking(informe, "lanzamientos_hipotecarios", "Andalucía")).toBe(194);
    expect(ranking(informe, "ejecuciones_hipotecarias", "Cataluña")).toBe(2320);
    expect(ranking(informe, "concursos", "Madrid")).toBe(3364);
    expect(ranking(informe, "concursos", "Andalucía")).toBe(2505);
    expect(ranking(informe, "concursos_personas_juridicas", "Cataluña")).toBe(301);
    expect(ranking(informe, "concursos_naturales_no_empresarios", "Cataluña")).toBe(3320);
    expect(ranking(informe, "despidos", "Madrid")).toBe(7785);
    expect(ranking(informe, "reclamaciones_cantidad", "Andalucía")).toBe(5142);
    expect(ranking(informe, "reclamaciones_cantidad", "Madrid")).toBe(4396);
    expect(ranking(informe, "reclamaciones_cantidad", "Cataluña")).toBe(3380);
    expect(ranking(informe, "monitorios", "Andalucía")).toBe(17916);
    expect(ranking(informe, "ocupacion_ilegal", "Andalucía")).toBe(66);
  });
});
