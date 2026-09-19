import type { ValorComunidad } from "../litigiosidad/comunidades";

export type IndicadorCrisis =
  | "lanzamientos"
  | "lanzamientos_lau"
  | "lanzamientos_hipotecarios"
  | "ejecuciones_hipotecarias"
  | "concursos"
  | "concursos_personas_juridicas"
  | "concursos_naturales_empresarios"
  | "concursos_naturales_no_empresarios"
  | "despidos"
  | "reclamaciones_cantidad"
  | "monitorios"
  | "ocupacion_ilegal";

export interface RankingCrisis extends ValorComunidad {
  indicador: IndicadorCrisis;
}

export interface LanzamientosCrisis {
  total: number;
  variacion_interanual_pct?: number;
  lau: number;
  lau_pct_del_total?: number;
  lau_variacion_interanual_pct?: number;
  hipotecarios_pct_del_total?: number;
  hipotecarios_variacion_interanual_pct?: number;
  otras?: number;
  otras_variacion_interanual_pct?: number;
  solicitados?: number;
  solicitados_variacion_interanual_pct?: number;
  solicitados_cumplimiento_positivo?: number;
  solicitados_cumplimiento_variacion_pct?: number;
}

export interface ConcursosCrisis {
  total: number;
  variacion_interanual_pct?: number;
  personas_juridicas?: number;
  personas_juridicas_variacion_interanual_pct?: number;
  naturales_empresarios?: number;
  naturales_empresarios_variacion_interanual_pct?: number;
  naturales_no_empresarios?: number;
  naturales_no_empresarios_variacion_interanual_pct?: number;
  declarados?: number;
  declarados_variacion_interanual_pct?: number;
  fase_convenio?: number;
  fase_convenio_variacion_pct?: number;
  fase_liquidacion?: number;
  fase_liquidacion_variacion_pct?: number;
  ere_art169?: number;
  ere_art169_variacion_pct?: number;
}

export interface DatoCrisis {
  total: number;
  variacion_interanual_pct?: number;
}

export interface DatosCrisisNacional {
  lanzamientos: LanzamientosCrisis;
  ejecuciones_hipotecarias: DatoCrisis;
  concursos: ConcursosCrisis;
  despidos: DatoCrisis;
  reclamaciones_cantidad: DatoCrisis;
  monitorios: DatoCrisis;
  ocupacion_ilegal: DatoCrisis;
}

export interface InformeCrisis {
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
  nacional: DatosCrisisNacional;
  rankings: RankingCrisis[];
}
