import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { provinciaDeOrgano } from "../lib/edictos/provincias";
import { buscarEdictos, leerDocumentoTeju } from "../lib/edictos/teju";

const RESULTADOS = new URL("./fixtures/teju-resultados.html", import.meta.url);
const DOCUMENTO = new URL("./fixtures/teju-documento.html", import.meta.url);

describe("buscarEdictos", () => {
  test("parsea resultados, fechas y paginación", async () => {
    const html = await readFile(RESULTADOS, "utf8");
    const fetchImpl = (async () =>
      new Response(html, { status: 200 })) as unknown as typeof fetch;

    const { edictos, siguiente } = await buscarEdictos({
      desde: "2026-06-15",
      hasta: "2026-06-20",
      fetchImpl,
    });

    expect(edictos).toHaveLength(3);

    const canarias = edictos.find((edicto) => edicto.provincia === "LAS PALMAS");
    expect(canarias?.fecha_publicacion).toBe("2026-06-20");
    expect(canarias?.fecha_edicto).toBe("2026-06-16");
    expect(canarias?.procedimiento).toBe("civil");
    expect(canarias?.referencia).toBe("BOE-J-2026-366556");
    expect(canarias?.url).toContain("BOE-J-2026-366556");

    expect(siguiente).toContain("accion=Mas");
  });
});

describe("provinciaDeOrgano", () => {
  test("mapea provincias y alias a CCAA", () => {
    expect(provinciaDeOrgano("... - LAS PALMAS")?.comunidad_autonoma).toBe("Canarias");
    expect(provinciaDeOrgano("... - BIZKAIA")?.comunidad_autonoma).toBe("País Vasco");
    expect(provinciaDeOrgano("... - CASTELLÓN")?.comunidad_autonoma).toBe(
      "Comunidad Valenciana",
    );
    expect(provinciaDeOrgano("... - CEUTA")?.comunidad_autonoma).toBeUndefined();
    expect(provinciaDeOrgano("JUZGADOS DE LO SOCIAL - BIZKAIA")?.provincia).toBe("Bizkaia");
  });
});

describe("leerDocumentoTeju", () => {
  test("extrae sección, provincia y objeto, y excluye destinatarios", async () => {
    const html = await readFile(DOCUMENTO, "utf8");
    const documento = leerDocumentoTeju(html);

    expect(documento.seccion).toBe("A");
    expect(documento.provincia).toBe("Madrid");
    expect(documento.procedimiento).toBe("Civil");
    expect(documento.resolucion).toBe("Auto");
    expect(documento.objeto).toContain("Notificación");

    expect(documento.textoClasificable).toContain("Sección A");
    expect(documento.textoClasificable).toContain("Procedimiento: Civil");
    expect(documento.textoClasificable).not.toContain("María");
    expect(documento.textoClasificable).not.toContain("12345678Z");
  });
});
