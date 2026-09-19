export interface DatoDivorcio {
  total: number;
  variacion_interanual_pct?: number;
}

export interface DatosDivorciosNacional {
  total: number;
  variacion_interanual_pct?: number;
  tasa_media_por_100000?: number;
  divorcios_consensuados?: DatoDivorcio;
  divorcios_no_consensuados?: DatoDivorcio;
  separaciones_consensuadas?: DatoDivorcio;
  separaciones_no_consensuadas?: DatoDivorcio;
  nulidades?: DatoDivorcio;
  modificacion_medidas_consensuadas?: DatoDivorcio;
  modificacion_medidas_no_consensuadas?: DatoDivorcio;
  guarda_custodia_consensuadas?: DatoDivorcio;
  guarda_custodia_no_consensuadas?: DatoDivorcio;
}

export interface ComunidadDivorcios {
  comunidad_autonoma: string;
  tasa_por_100000: number;
}

export interface InformeDivorcios {
  version_esquema: 1;
  anio: number;
  trimestre: number;
  generado_en: string;
  origen: "nota_prensa";
  fuente: {
    url: string;
    titulo: string;
    fecha_publicacion?: string;
    pdf_url?: string;
  };
  nacional: DatosDivorciosNacional;
  comunidades: ComunidadDivorcios[];
}
