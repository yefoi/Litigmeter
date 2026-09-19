import { buscarProvinciaEnTexto, normalizarProvincia } from "../litigiosidad/provincias";

export interface ProvinciaComunidad {
  provincia: string;
  comunidad_autonoma?: string;
}

/** Extrae la provincia del texto de un órgano judicial ("... - MADRID"). */
export function provinciaDeOrgano(organo: string): ProvinciaComunidad | undefined {
  const partes = organo.split(" - ");
  const candidata = partes[partes.length - 1] ?? "";
  const provincia = normalizarProvincia(candidata) ?? buscarProvinciaEnTexto(candidata);
  if (!provincia) return undefined;
  return { provincia: provincia.nombre, comunidad_autonoma: provincia.comunidad_autonoma };
}
