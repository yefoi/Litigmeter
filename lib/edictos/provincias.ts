export interface ProvinciaComunidad {
  provincia: string;
  comunidad_autonoma?: string;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PROVINCIAS: Array<[string, string | undefined, string[]?]> = [
  ["Almería", "Andalucía"],
  ["Cádiz", "Andalucía"],
  ["Córdoba", "Andalucía"],
  ["Granada", "Andalucía"],
  ["Huelva", "Andalucía"],
  ["Jaén", "Andalucía"],
  ["Málaga", "Andalucía"],
  ["Sevilla", "Andalucía"],
  ["Huesca", "Aragón"],
  ["Teruel", "Aragón"],
  ["Zaragoza", "Aragón"],
  ["Asturias", "Asturias", ["Principado de Asturias"]],
  ["Illes Balears", "Baleares", ["Islas Baleares", "Baleares"]],
  ["Las Palmas", "Canarias"],
  ["Santa Cruz de Tenerife", "Canarias", ["S/C de Tenerife", "SC de Tenerife"]],
  ["Cantabria", "Cantabria"],
  ["Ávila", "Castilla y León"],
  ["Burgos", "Castilla y León"],
  ["León", "Castilla y León"],
  ["Palencia", "Castilla y León"],
  ["Salamanca", "Castilla y León"],
  ["Segovia", "Castilla y León"],
  ["Soria", "Castilla y León"],
  ["Valladolid", "Castilla y León"],
  ["Zamora", "Castilla y León"],
  ["Albacete", "Castilla-La Mancha"],
  ["Ciudad Real", "Castilla-La Mancha"],
  ["Cuenca", "Castilla-La Mancha"],
  ["Guadalajara", "Castilla-La Mancha"],
  ["Toledo", "Castilla-La Mancha"],
  ["Barcelona", "Cataluña"],
  ["Girona", "Cataluña", ["Gerona"]],
  ["Lleida", "Cataluña", ["Lérida"]],
  ["Tarragona", "Cataluña"],
  ["Alicante", "Comunidad Valenciana", ["Alacant"]],
  ["Castellón", "Comunidad Valenciana", ["Castelló"]],
  ["Valencia", "Comunidad Valenciana", ["València"]],
  ["Badajoz", "Extremadura"],
  ["Cáceres", "Extremadura"],
  ["A Coruña", "Galicia", ["La Coruña", "Coruña"]],
  ["Lugo", "Galicia"],
  ["Ourense", "Galicia", ["Orense"]],
  ["Pontevedra", "Galicia"],
  ["La Rioja", "La Rioja", ["Rioja"]],
  ["Madrid", "Madrid", ["Comunidad de Madrid"]],
  ["Murcia", "Murcia", ["Región de Murcia"]],
  ["Navarra", "Navarra", ["Comunidad Foral de Navarra"]],
  ["Álava", "País Vasco", ["Araba"]],
  ["Gipuzkoa", "País Vasco", ["Guipúzcoa"]],
  ["Bizkaia", "País Vasco", ["Vizcaya"]],
  ["Ceuta", undefined],
  ["Melilla", undefined],
];

const INDICE = new Map<string, ProvinciaComunidad>();
for (const [provincia, comunidad, alias] of PROVINCIAS) {
  INDICE.set(normalizar(provincia), { provincia, comunidad_autonoma: comunidad });
  for (const variante of alias ?? []) {
    INDICE.set(normalizar(variante), { provincia, comunidad_autonoma: comunidad });
  }
}

/** Extrae la provincia del texto de un órgano judicial ("... - MADRID"). */
export function provinciaDeOrgano(organo: string): ProvinciaComunidad | undefined {
  const partes = organo.split(" - ");
  const candidata = normalizar(partes[partes.length - 1] ?? "");
  const directa = INDICE.get(candidata);
  if (directa) return directa;
  for (const [clave, valor] of INDICE) {
    if (candidata.includes(clave)) return valor;
  }
  return undefined;
}
