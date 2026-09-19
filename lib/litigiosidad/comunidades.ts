import { COMUNIDADES } from "./ccaa";
import { aNumero } from "./parser";

export interface ValorComunidad {
  comunidad_autonoma: string;
  valor: number;
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PATRON_COMUNIDAD = new RegExp(
  COMUNIDADES.flatMap((comunidad) => [comunidad.nombre, ...comunidad.alias])
    .sort((a, b) => b.length - a.length)
    .map((nombre) => `(?<![\\p{L}])${escapar(nombre)}(?![\\p{L}])`)
    .join("|"),
  "giu",
);

const PATRON_NUMERO = /\d{1,3}(?:\.\d{3})*(?:,\d+)?/g;

function normalizar(nombre: string): string | undefined {
  const limpio = nombre.toLowerCase();
  for (const comunidad of COMUNIDADES) {
    if (comunidad.nombre.toLowerCase() === limpio) return comunidad.nombre;
    if (comunidad.alias.some((alias) => alias.toLowerCase() === limpio)) return comunidad.nombre;
  }
  return undefined;
}

/**
 * Primer número (no porcentaje) que sigue al nombre de cada comunidad en el texto.
 * Pensado para listas del tipo "Navarra, con 52,4; Comunidad Valenciana, con 49,6".
 */
export function valoresPorComunidad(texto: string, limite = 90): ValorComunidad[] {
  const comunidades = new Map<string, ValorComunidad>();
  const nombres = [...texto.matchAll(PATRON_COMUNIDAD)];

  for (let indice = 0; indice < nombres.length; indice++) {
    const coincidencia = nombres[indice];
    const canonica = normalizar(coincidencia[0]);
    if (!canonica || comunidades.has(canonica)) continue;

    const desde = (coincidencia.index ?? 0) + coincidencia[0].length;
    const hasta = nombres[indice + 1]?.index ?? texto.length;
    const fragmento = texto.slice(desde, Math.min(hasta, desde + limite));

    PATRON_NUMERO.lastIndex = 0;
    let numero: RegExpExecArray | null;
    while ((numero = PATRON_NUMERO.exec(fragmento)) !== null) {
      const resto = fragmento.slice(numero.index + numero[0].length);
      if (/^\s*%/.test(resto)) continue;
      comunidades.set(canonica, { comunidad_autonoma: canonica, valor: aNumero(numero[0]) });
      break;
    }
  }

  return [...comunidades.values()];
}
