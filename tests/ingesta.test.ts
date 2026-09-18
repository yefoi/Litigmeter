import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ingerirNota } from "../lib/litigiosidad/ingest";
import type { InformeTrimestral } from "../lib/litigiosidad/tipos";

const FIXTURE = new URL("./fixtures/nota-2026T1.html", import.meta.url);
const URL_NOTA =
  "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Notas-de-prensa/nota-de-prueba";

async function prepararEntorno(): Promise<string> {
  const base = await mkdtemp(path.join(os.tmpdir(), "litigmeter-ingesta-"));
  await mkdir(path.join(base, "anual"), { recursive: true });
  await writeFile(
    path.join(base, "anual", "litigiosidad-anual.json"),
    JSON.stringify({
      version_esquema: 1,
      fuente: { url: "https://ejemplo.test/series", titulo: "Series" },
      anios: [2024, 2025],
      nacional: [153.74, 153.74],
      comunidades: [{ comunidad_autonoma: "Canarias", valores: [212.51, 202.86] }],
    }),
    "utf8",
  );
  return base;
}

describe("ingerirNota", () => {
  test("escribe el informe, es idempotente y permite reclasificar", async () => {
    const base = await prepararEntorno();
    try {
      const dataDir = path.join(base, "litigiosidad");
      const opciones = { dataDir, edictosDir: path.join(base, "edictos") };
      const html = await readFile(FIXTURE, "utf8");

      const primera = await ingerirNota(URL_NOTA, html, opciones);
      expect(primera.estado).toBe("creado");

      const guardado = JSON.parse(await readFile(primera.fichero, "utf8")) as InformeTrimestral;
      expect(guardado.comunidades).toHaveLength(17);
      expect(guardado.comunidades[0].comunidad_autonoma).toBe("Canarias");
      expect(guardado.comunidades[0].posicion_nacional).toBe(1);
      expect(guardado.nacional.tasa_litigiosidad).toBeCloseTo(37.15);
      expect(guardado.fuente.url).toBe(URL_NOTA);

      const serializado = JSON.stringify(guardado);
      expect(serializado).not.toContain("serie_anual");
      expect(serializado).not.toContain("edictos_representativos");

      const segunda = await ingerirNota(URL_NOTA, html, opciones);
      expect(segunda.estado).toBe("sin_cambios");

      const tercera = await ingerirNota(URL_NOTA, html, { ...opciones, reclasificar: true });
      expect(tercera.estado).toBe("actualizado");
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
