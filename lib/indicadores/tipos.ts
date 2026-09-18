export interface TasasIndicadores {
  resolucion?: number;
  resolucion_anio_anterior?: number;
  pendencia?: number;
  pendencia_anio_anterior?: number;
  congestion?: number;
  congestion_anio_anterior?: number;
  litigiosidad?: number;
  litigiosidad_anio_anterior?: number;
}

/**
 * Indicadores clave del CGPJ por trimestre (`data/indicadores/AAAA-Tn.json`),
 * extraídos de los PDFs "Indicadores clave del conjunto de las jurisdicciones".
 */
export interface FicheroIndicadores {
  version_esquema: 1;
  anio: number;
  trimestre: number;
  fuente: { url: string; titulo: string };
  nacional?: TasasIndicadores;
  comunidades: Record<string, TasasIndicadores>;
}
