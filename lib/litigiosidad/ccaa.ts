export interface ComunidadCgpj {
  nombre: string;
  alias: string[];
}

/** Las 17 comunidades autónomas con las variantes de nombre que usa el CGPJ. */
export const COMUNIDADES: ComunidadCgpj[] = [
  { nombre: "Andalucía", alias: ["Andalucia"] },
  { nombre: "Aragón", alias: ["Aragon"] },
  { nombre: "Asturias", alias: ["Principado de Asturias"] },
  { nombre: "Baleares", alias: ["Illes Balears", "Islas Baleares", "Balears"] },
  { nombre: "Canarias", alias: [] },
  { nombre: "Cantabria", alias: [] },
  { nombre: "Castilla y León", alias: ["Castilla y Leon"] },
  { nombre: "Castilla-La Mancha", alias: ["Castilla La Mancha"] },
  { nombre: "Cataluña", alias: ["Catalunya", "Cataluna"] },
  { nombre: "Comunidad Valenciana", alias: ["Comunitat Valenciana", "Valenciana"] },
  { nombre: "Extremadura", alias: [] },
  { nombre: "Galicia", alias: [] },
  { nombre: "La Rioja", alias: ["Rioja"] },
  { nombre: "Madrid", alias: ["Comunidad de Madrid"] },
  { nombre: "Murcia", alias: ["Región de Murcia", "Region de Murcia"] },
  { nombre: "Navarra", alias: ["Comunidad Foral de Navarra"] },
  { nombre: "País Vasco", alias: ["Pais Vasco", "Euskadi"] },
];

/** Normaliza un nombre de TSJ/CCAA (con o sin tildes, alias) al nombre canónico. */
export function normalizarComunidad(nombre: string): string | undefined {
  const limpio = nombre.replace(/\s+/g, " ").trim().toLowerCase();
  for (const comunidad of COMUNIDADES) {
    if (comunidad.nombre.toLowerCase() === limpio) return comunidad.nombre;
    if (comunidad.alias.some((alias) => alias.toLowerCase() === limpio)) return comunidad.nombre;
  }
  return undefined;
}
