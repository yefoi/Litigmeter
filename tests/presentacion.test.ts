import { describe, expect, test } from "vitest";
import { COMUNIDADES } from "../lib/litigiosidad/ccaa";
import { comunidadDeSlug, slugDeComunidad } from "../lib/litigiosidad/presentacion";

describe("slugDeComunidad", () => {
  test("quita tildes y separa con guiones", () => {
    expect(slugDeComunidad("País Vasco")).toBe("pais-vasco");
    expect(slugDeComunidad("Castilla y León")).toBe("castilla-y-leon");
    expect(slugDeComunidad("Comunidad Valenciana")).toBe("comunidad-valenciana");
    expect(slugDeComunidad("La Rioja")).toBe("la-rioja");
  });

  test("ida y vuelta para las 17 comunidades", () => {
    for (const comunidad of COMUNIDADES) {
      expect(comunidadDeSlug(slugDeComunidad(comunidad.nombre))).toBe(comunidad.nombre);
    }
  });

  test("slug desconocido devuelve undefined", () => {
    expect(comunidadDeSlug("atlantida")).toBeUndefined();
  });
});
