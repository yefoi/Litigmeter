import { describe, expect, test } from "vitest";
import { informeDesdeIndicadores } from "../lib/indicadores/informe";
import { documentosDeInforme, periodoDeTitulo } from "../lib/indicadores/pagina";
import type { FicheroIndicadores } from "../lib/indicadores/tipos";

describe("periodoDeTitulo", () => {
  test("lee ordinal y año", () => {
    expect(
      periodoDeTitulo("Indicadores clave del conjunto de las jurisdicciones - Tercer Trimestre 2024"),
    ).toEqual({ anio: 2024, trimestre: 3 });
  });

  test("devuelve undefined sin periodo", () => {
    expect(periodoDeTitulo("Otra cosa")).toBeUndefined();
  });
});

describe("documentosDeInforme", () => {
  const html = `
    <a href="/stfls/ESTADISTICA/FICHEROS/Indicadores Clave/Indicadores a Nivel Nacional - Primer Trimestre 2026.pdf">Nacional</a>
    <a href="/stfls/ESTADISTICA/FICHEROS/Indicadores Clave/Indicadores TSJ Canarias - Primer Trimestre 2026.pdf">Canarias</a>
    <a href="/stfls/ESTADISTICA/FICHEROS/Indicadores Clave/Indicadores TSJ Islas Baleares - Primer Trimestre 2026.pdf">Baleares</a>
    <a href="/otro/documento.pdf">Otro</a>
  `;

  test("extrae solo los PDFs de indicadores", () => {
    const documentos = documentosDeInforme(html);

    expect(documentos).toHaveLength(3);
    expect(documentos[0].esNacional).toBe(true);
    expect(documentos[1].entidad).toBe("Canarias");
    expect(documentos[2].entidad).toBe("Islas Baleares");
  });
});

describe("informeDesdeIndicadores", () => {
  const fichero: FicheroIndicadores = {
    version_esquema: 1,
    anio: 2020,
    trimestre: 2,
    fuente: { url: "https://ejemplo.test", titulo: "Indicadores clave" },
    nacional: { litigiosidad: 50 },
    comunidades: { Canarias: { litigiosidad: 60 }, Madrid: { litigiosidad: 40 } },
  };

  test("ordena por tasa, numera posiciones y marca el origen", () => {
    const informe = informeDesdeIndicadores(fichero);

    expect(informe.origen).toBe("indicadores");
    expect(informe.comunidades[0].comunidad_autonoma).toBe("Canarias");
    expect(informe.comunidades[0].posicion_nacional).toBe(1);
    expect(informe.comunidades[1].comunidad_autonoma).toBe("Madrid");
    expect(informe.nacional.tasa_litigiosidad).toBe(50);
  });

  test("falla si no hay litigiosidad nacional", () => {
    expect(() => informeDesdeIndicadores({ ...fichero, nacional: undefined })).toThrow();
  });
});
