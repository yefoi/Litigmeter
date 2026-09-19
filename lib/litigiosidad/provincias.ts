export interface Provincia {
  nombre: string;
  comunidad_autonoma?: string;
  alias: string[];
}

/** Las 52 provincias con las variantes que usan el CGPJ, el BOE y los TEJU. */
export const PROVINCIAS: Provincia[] = [
  { nombre: "Álava", comunidad_autonoma: "País Vasco", alias: ["Araba", "Araba/Álava", "Álava/Araba", "Vitoria"] },
  { nombre: "Albacete", comunidad_autonoma: "Castilla-La Mancha", alias: [] },
  { nombre: "Alicante", comunidad_autonoma: "Comunidad Valenciana", alias: ["Alacant", "Alicante/Alacant"] },
  { nombre: "Almería", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "Asturias", comunidad_autonoma: "Asturias", alias: ["Principado de Asturias"] },
  { nombre: "Ávila", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Badajoz", comunidad_autonoma: "Extremadura", alias: [] },
  { nombre: "Baleares", comunidad_autonoma: "Baleares", alias: ["Balears, Illes", "Illes Balears", "Islas Baleares", "Balears"] },
  { nombre: "Barcelona", comunidad_autonoma: "Cataluña", alias: [] },
  { nombre: "Bizkaia", comunidad_autonoma: "País Vasco", alias: ["Vizcaya", "Bilbao"] },
  { nombre: "Burgos", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Cáceres", comunidad_autonoma: "Extremadura", alias: [] },
  { nombre: "Cádiz", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "Cantabria", comunidad_autonoma: "Cantabria", alias: [] },
  { nombre: "Castellón", comunidad_autonoma: "Comunidad Valenciana", alias: ["Castelló", "Castellón/Castelló"] },
  { nombre: "Ciudad Real", comunidad_autonoma: "Castilla-La Mancha", alias: [] },
  { nombre: "Córdoba", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "A Coruña", comunidad_autonoma: "Galicia", alias: ["Coruña, A", "La Coruña", "Coruña"] },
  { nombre: "Cuenca", comunidad_autonoma: "Castilla-La Mancha", alias: [] },
  { nombre: "Gipuzkoa", comunidad_autonoma: "País Vasco", alias: ["Guipúzcoa", "San Sebastián", "Donostia"] },
  { nombre: "Girona", comunidad_autonoma: "Cataluña", alias: ["Gerona"] },
  { nombre: "Granada", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "Guadalajara", comunidad_autonoma: "Castilla-La Mancha", alias: [] },
  { nombre: "Huelva", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "Huesca", comunidad_autonoma: "Aragón", alias: [] },
  { nombre: "Jaén", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "León", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Lleida", comunidad_autonoma: "Cataluña", alias: ["Lérida"] },
  { nombre: "Lugo", comunidad_autonoma: "Galicia", alias: [] },
  { nombre: "Madrid", comunidad_autonoma: "Madrid", alias: ["Comunidad de Madrid"] },
  { nombre: "Málaga", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "Murcia", comunidad_autonoma: "Murcia", alias: ["Región de Murcia"] },
  { nombre: "Navarra", comunidad_autonoma: "Navarra", alias: ["Comunidad Foral de Navarra", "Pamplona"] },
  { nombre: "Ourense", comunidad_autonoma: "Galicia", alias: ["Orense"] },
  { nombre: "Palencia", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Las Palmas", comunidad_autonoma: "Canarias", alias: ["Palmas, Las", "Palmas de Gran Canaria, Las"] },
  { nombre: "Pontevedra", comunidad_autonoma: "Galicia", alias: ["Vigo"] },
  { nombre: "La Rioja", comunidad_autonoma: "La Rioja", alias: ["Rioja, La", "Rioja", "Logroño"] },
  { nombre: "Salamanca", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Santa Cruz de Tenerife", comunidad_autonoma: "Canarias", alias: ["S/C de Tenerife", "Tenerife"] },
  { nombre: "Segovia", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Sevilla", comunidad_autonoma: "Andalucía", alias: [] },
  { nombre: "Soria", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Tarragona", comunidad_autonoma: "Cataluña", alias: [] },
  { nombre: "Teruel", comunidad_autonoma: "Aragón", alias: [] },
  { nombre: "Toledo", comunidad_autonoma: "Castilla-La Mancha", alias: [] },
  { nombre: "Valencia", comunidad_autonoma: "Comunidad Valenciana", alias: ["València", "Valencia/València"] },
  { nombre: "Valladolid", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Zamora", comunidad_autonoma: "Castilla y León", alias: [] },
  { nombre: "Zaragoza", comunidad_autonoma: "Aragón", alias: [] },
  { nombre: "Ceuta", comunidad_autonoma: undefined, alias: [] },
  { nombre: "Melilla", comunidad_autonoma: undefined, alias: [] },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const INDICE = new Map<string, Provincia>();
for (const provincia of PROVINCIAS) {
  INDICE.set(normalizar(provincia.nombre), provincia);
  for (const variante of provincia.alias) {
    INDICE.set(normalizar(variante), provincia);
  }
}

export function normalizarProvincia(texto: string): Provincia | undefined {
  return INDICE.get(normalizar(texto));
}

/** Busca una provincia dentro de un texto libre (nombre exacto o contenido). */
export function buscarProvinciaEnTexto(texto: string): Provincia | undefined {
  const directa = normalizarProvincia(texto);
  if (directa) return directa;
  const candidato = normalizar(texto);
  for (const [clave, provincia] of INDICE) {
    if (candidato.includes(clave)) return provincia;
  }
  return undefined;
}
