import type { FicheroIndicadores } from "./indicadores/tipos";
import type { InformeTrimestral } from "./litigiosidad/tipos";

export interface Discrepancia {
  ambito: string;
  anio: number;
  trimestre: number;
  variable: string;
  valor_nota: number;
  valor_indicadores: number;
  diferencia: number;
  relativa_pct: number;
  fuente_indicadores: string;
}

export interface InformeReconciliacion {
  version_esquema: 1;
  generado_en: string;
  discrepancias: Discrepancia[];
  fuentes: { informes: number; indicadores: number };
}

const UMBRAL_ABSOLUTO = 0.1;
const UMBRAL_RELATIVO_PCT = 0.5;

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function comparar(
  ambito: string,
  anio: number,
  trimestre: number,
  variable: string,
  valorNota: number | undefined,
  valorIndicadores: number | undefined,
  fuente: string,
): Discrepancia | undefined {
  if (valorNota === undefined || valorIndicadores === undefined) return undefined;
  const diferencia = redondear(valorNota - valorIndicadores);
  const relativa = valorIndicadores !== 0 ? redondear((diferencia / valorIndicadores) * 100) : 0;
  if (Math.abs(diferencia) <= UMBRAL_ABSOLUTO && Math.abs(relativa) <= UMBRAL_RELATIVO_PCT) {
    return undefined;
  }
  return {
    ambito,
    anio,
    trimestre,
    variable,
    valor_nota: valorNota,
    valor_indicadores: valorIndicadores,
    diferencia,
    relativa_pct: relativa,
    fuente_indicadores: fuente,
  };
}

/**
 * Contraste entre la nota de prensa y los indicadores clave:
 * - mismo trimestre (si hay indicadores de ese trimestre),
 * - trimestre del año siguiente, cuyo "año anterior" debería coincidir con la nota.
 */
export function reconciliar(
  informes: InformeTrimestral[],
  indicadores: FicheroIndicadores[],
): InformeReconciliacion {
  const porClave = new Map(
    indicadores.map((fichero) => [`${fichero.anio}-T${fichero.trimestre}`, fichero]),
  );
  const discrepancias: Discrepancia[] = [];

  for (const informe of informes) {
    const propios = porClave.get(`${informe.anio}-T${informe.trimestre}`);
    if (propios) {
      const fuente = `${propios.anio}-T${propios.trimestre}`;
      const nacional = comparar(
        "Nacional",
        informe.anio,
        informe.trimestre,
        "tasa_litigiosidad",
        informe.nacional.tasa_litigiosidad,
        propios.nacional?.litigiosidad,
        fuente,
      );
      if (nacional) discrepancias.push(nacional);
      for (const registro of informe.comunidades) {
        const d = comparar(
          registro.comunidad_autonoma,
          informe.anio,
          informe.trimestre,
          "tasa_litigiosidad",
          registro.tasa_litigiosidad,
          propios.comunidades[registro.comunidad_autonoma]?.litigiosidad,
          fuente,
        );
        if (d) discrepancias.push(d);
      }
    }

    const siguiente = porClave.get(`${informe.anio + 1}-T${informe.trimestre}`);
    if (siguiente) {
      const fuente = `${siguiente.anio}-T${siguiente.trimestre} (año anterior)`;
      const nacional = comparar(
        "Nacional",
        informe.anio,
        informe.trimestre,
        "tasa_litigiosidad_anio_anterior",
        informe.nacional.tasa_litigiosidad,
        siguiente.nacional?.litigiosidad_anio_anterior,
        fuente,
      );
      if (nacional) discrepancias.push(nacional);
      for (const registro of informe.comunidades) {
        const d = comparar(
          registro.comunidad_autonoma,
          informe.anio,
          informe.trimestre,
          "tasa_litigiosidad_anio_anterior",
          registro.tasa_litigiosidad,
          siguiente.comunidades[registro.comunidad_autonoma]?.litigiosidad_anio_anterior,
          fuente,
        );
        if (d) discrepancias.push(d);
      }
    }
  }

  return {
    version_esquema: 1,
    generado_en: new Date().toISOString(),
    discrepancias,
    fuentes: { informes: informes.length, indicadores: indicadores.length },
  };
}
