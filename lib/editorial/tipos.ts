export interface DestacadoEditorial {
  comunidad_autonoma: string;
  tendencia: string;
  gravedad: string;
  detalle: string;
  evidencia?: string;
}

export interface ResumenEditorial {
  version_esquema: 1;
  anio: number;
  trimestre: number;
  generado_en: string;
  titular: string;
  entradilla: string;
  foco?: DestacadoEditorial;
  destacados: DestacadoEditorial[];
  fuente: { url: string; titulo: string };
}
