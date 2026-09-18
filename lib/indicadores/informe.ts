import { COMUNIDADES } from "../litigiosidad/ccaa";
import type { InformeTrimestral } from "../litigiosidad/tipos";
import type { FicheroIndicadores } from "./tipos";

/**
 * Convierte un fichero de indicadores en un informe trimestral mínimo (sin
 * clasificación) para que el histórico del panel use la misma estructura que
 * las notas de prensa. Queda marcado con `origen: "indicadores"`.
 */
export function informeDesdeIndicadores(fichero: FicheroIndicadores): InformeTrimestral {
  const nacional = fichero.nacional?.litigiosidad;
  if (nacional === undefined) {
    throw new Error(
      `Los indicadores ${fichero.anio}-T${fichero.trimestre} no traen litigiosidad nacional`,
    );
  }

  const comunidades = COMUNIDADES.map((comunidad) => ({
    comunidad_autonoma: comunidad.nombre,
    tasa: fichero.comunidades[comunidad.nombre]?.litigiosidad,
  }))
    .filter(
      (registro): registro is { comunidad_autonoma: string; tasa: number } =>
        typeof registro.tasa === "number",
    )
    .sort((a, b) => b.tasa - a.tasa)
    .map((registro, indice) => ({
      comunidad_autonoma: registro.comunidad_autonoma,
      tasa_litigiosidad: registro.tasa,
      posicion_nacional: indice + 1,
    }));

  return {
    version_esquema: 1,
    anio: fichero.anio,
    trimestre: fichero.trimestre,
    generado_en: new Date().toISOString(),
    origen: "indicadores",
    fuente: { url: fichero.fuente.url, titulo: fichero.fuente.titulo },
    resumen_nota: "",
    nacional: {
      tasa_litigiosidad: nacional,
      tasa_litigiosidad_anio_anterior: fichero.nacional?.litigiosidad_anio_anterior,
    },
    comunidades,
  };
}
