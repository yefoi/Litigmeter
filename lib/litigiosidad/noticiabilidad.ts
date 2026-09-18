export const UMBRAL_NOTICIABLE_POR_DEFECTO = 0.75;

/** Umbral configurable con UMBRAL_NOTICIABLE; si no es válido, usa el valor por defecto. */
export function umbralNoticiable(): number {
  const crudo = process.env.UMBRAL_NOTICIABLE;
  if (!crudo) return UMBRAL_NOTICIABLE_POR_DEFECTO;
  const valor = Number.parseFloat(crudo.replace(",", "."));
  if (!Number.isFinite(valor) || valor < 0 || valor > 1) {
    return UMBRAL_NOTICIABLE_POR_DEFECTO;
  }
  return valor;
}

export function esNoticiable(probabilidad: number, umbral = umbralNoticiable()): boolean {
  return probabilidad > umbral;
}

export interface ConteoUmbral {
  umbral: number;
  noticiables: number;
  total: number;
}

export function contarPorUmbral(
  probabilidades: number[],
  umbrales: number[] = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9],
): ConteoUmbral[] {
  return umbrales.map((umbral) => ({
    umbral,
    noticiables: probabilidades.filter((probabilidad) => probabilidad > umbral).length,
    total: probabilidades.length,
  }));
}
