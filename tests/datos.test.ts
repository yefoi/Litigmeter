import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { validarDatos } from "../lib/esquemas";

describe("validarDatos", () => {
  test("los datos del repositorio validan", async () => {
    const errores = await validarDatos(path.join(process.cwd(), "data"));
    expect(errores).toEqual([]);
  });

  test("detecta un informe inválido", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "litigmeter-datos-"));
    try {
      await mkdir(path.join(dir, "litigiosidad"), { recursive: true });
      await writeFile(
        path.join(dir, "litigiosidad", "2026-T1.json"),
        JSON.stringify({ version_esquema: 1, anio: 2026, trimestre: 9 }),
        "utf8",
      );

      const errores = await validarDatos(dir);
      expect(errores).toHaveLength(1);
      expect(errores[0].ruta).toBe(path.join("litigiosidad", "2026-T1.json"));
      expect(errores[0].error).toContain("trimestre");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
