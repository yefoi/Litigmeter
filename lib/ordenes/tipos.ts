export type OrdenJurisdiccional = "civil" | "penal" | "contencioso" | "social";

export interface SerieOrden {
  orden: OrdenJurisdiccional;
  nacional: {
    ingresados: (number | null)[];
    resueltos: (number | null)[];
    en_tramite: (number | null)[];
  };
  comunidades: Array<{
    comunidad_autonoma: string;
    ingresados: (number | null)[];
    resueltos: (number | null)[];
    en_tramite: (number | null)[];
  }>;
}

export interface SerieOrdenes {
  version_esquema: 1;
  fuente: { url: string; titulo: string };
  anios: number[];
  ordenes: SerieOrden[];
}
