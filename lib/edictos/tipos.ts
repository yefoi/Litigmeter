export type TipoProcedimiento =
  | "civil"
  | "penal"
  | "social"
  | "mercantil"
  | "contencioso_administrativo"
  | "otro";

export interface Edicto {
  organo_judicial: string;
  comunidad_autonoma?: string;
  numero_procedimiento?: string;
  fecha_publicacion: string;
  texto: string;
}

export interface ClasificacionEdicto {
  tipo_procedimiento: TipoProcedimiento;
  /** Posición fraccionaria (0–4) sobre cinco niveles de relevancia editorial. */
  relevancia_editorial: number;
  es_representativo: boolean;
  probabilidad_representativo: number;
  confianza_tipo?: number;
  confianza_relevancia?: number;
  modelo: string;
}

/** Evidencia saneada que recibe el clasificador trimestral: nunca el texto íntegro. */
export interface EvidenciaEdicto {
  tipo_procedimiento: TipoProcedimiento;
  resumen: string;
}

export interface EdictoClasificado {
  edicto: Edicto;
  clasificacion: ClasificacionEdicto;
}

/**
 * Fichero opcional de evidencia por trimestre (`data/edictos/AAAA-Tn.json`).
 * Lo puede generar una ingesta TEJU futura o aportarse a mano; siempre saneado.
 */
export interface FicheroEvidencias {
  version_esquema: 1;
  anio: number;
  trimestre: number;
  comunidades: Record<string, EvidenciaEdicto[]>;
}
