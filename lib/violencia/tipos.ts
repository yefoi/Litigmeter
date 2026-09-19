export interface DatosViolenciaNacional {
  denuncias: number;
  denuncias_variacion_interanual_pct?: number;
  mujeres_denunciantes?: number;
  mujeres_variacion_interanual_pct?: number;
  tasa_victimas_por_10000: number;
  tasa_delta_puntos?: number;
  renuncias?: number;
  renuncias_pct?: number;
  renuncias_variacion_interanual_pct?: number;
  ordenes_solicitadas?: number;
  ordenes_solicitadas_variacion_pct?: number;
  ordenes_acordadas?: number;
  ordenes_acordadas_variacion_pct?: number;
  sentencias?: number;
  sentencias_condenatorias_pct?: number;
  violencia_sexual_denuncias?: number;
  violencia_sexual_ordenes_solicitadas?: number;
  violencia_sexual_ordenes_acordadas?: number;
}

export interface TasasViolenciaComunidad {
  comunidad_autonoma: string;
  tasa_victimas_por_10000: number;
}

export interface InformeViolencia {
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
  nacional: DatosViolenciaNacional;
  comunidades: TasasViolenciaComunidad[];
}
