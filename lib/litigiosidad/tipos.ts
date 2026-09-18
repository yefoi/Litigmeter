import type { EvidenciaEdicto } from "../edictos/tipos";

export type Tendencia = "mejora" | "estable" | "empeora";

/** Estado que se envía al modelo jev para una CCAA y trimestre. */
export interface DatoTrimestral {
  comunidad_autonoma: string;
  anio: number;
  trimestre: number;
  tasa_litigiosidad_actual: number;
  tasa_litigiosidad_trimestre_anterior?: number;
  variacion_trimestral_pct?: number;
  tasa_litigiosidad_media_nacional: number;
  variacion_interanual_pct?: number;
  serie_historica: PuntoSerie[];
  /** Casos concretos saneados (sin datos personales) para sustentar la clasificación. */
  edictos_representativos?: EvidenciaEdicto[];
  resumen_nota_prensa?: string;
}

export interface PuntoSerie {
  anio: number;
  trimestre: number;
  tasa_litigiosidad: number;
}

export interface ClasificacionLitigiosidad {
  tendencia: Tendencia;
  /** Posición fraccionaria (0–4) sobre cinco niveles descriptivos de carga. */
  gravedad_congestion: number;
  es_noticiable: boolean;
  probabilidad_noticiable: number;
  confianza_tendencia?: number;
  confianza_gravedad?: number;
  modelo: string;
}

export interface RegistroComunidad {
  comunidad_autonoma: string;
  tasa_litigiosidad: number;
  tasa_litigiosidad_trimestre_anterior?: number;
  variacion_trimestral_pct?: number;
  variacion_interanual_pct?: number;
  diferencial_vs_nacional?: number;
  posicion_nacional: number;
  clasificacion?: ClasificacionLitigiosidad;
  error_clasificacion?: string;
}

export interface ResumenNacional {
  tasa_litigiosidad: number;
  tasa_litigiosidad_anio_anterior?: number;
  variacion_interanual_pct?: number;
}

export interface FuenteNota {
  url: string;
  titulo: string;
  fecha_publicacion?: string;
  pdf_url?: string;
}

export interface InformeTrimestral {
  version_esquema: 1;
  anio: number;
  trimestre: number;
  generado_en: string;
  fuente: FuenteNota;
  resumen_nota: string;
  nacional: ResumenNacional;
  comunidades: RegistroComunidad[];
}

export interface ComunidadParseada {
  nombre: string;
  tasa: number;
}

export interface NotaParseada {
  url: string;
  titulo: string;
  fecha_publicacion?: string;
  anio: number;
  trimestre: number;
  nacional: ResumenNacional;
  comunidades: ComunidadParseada[];
  comunidades_ausentes: string[];
  resumen: string;
  pdf_url?: string;
}
