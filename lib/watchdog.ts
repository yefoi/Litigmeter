const DIA_MS = 24 * 60 * 60 * 1000;

export interface PeriodoEsperado {
  anio: number;
  trimestre: number;
  fechaEsperada: string;
}

/**
 * Trimestre cuyo informe ya debería estar publicado en `fecha`, con unos días de
 * gracia sobre las fechas habituales del CGPJ: T1 ~25/06, T2 ~20/10, T3 ~15/12,
 * T4 ~25/03 del año siguiente.
 */
export function trimestreEsperado(fecha: Date, graciaDias = 10): PeriodoEsperado {
  const anio = fecha.getUTCFullYear();
  const candidatos = [
    { anio: anio - 1, trimestre: 3, fecha: new Date(Date.UTC(anio - 1, 11, 15)) },
    { anio: anio - 1, trimestre: 4, fecha: new Date(Date.UTC(anio, 2, 25)) },
    { anio, trimestre: 1, fecha: new Date(Date.UTC(anio, 5, 25)) },
    { anio, trimestre: 2, fecha: new Date(Date.UTC(anio, 9, 20)) },
    { anio, trimestre: 3, fecha: new Date(Date.UTC(anio, 11, 15)) },
  ];

  let esperado = candidatos[0];
  for (const candidato of candidatos) {
    const limite = new Date(candidato.fecha.getTime() + graciaDias * DIA_MS);
    if (fecha.getTime() >= limite.getTime()) esperado = candidato;
  }

  return {
    anio: esperado.anio,
    trimestre: esperado.trimestre,
    fechaEsperada: esperado.fecha.toISOString().slice(0, 10),
  };
}

export function esPosteriorOIgual(
  disponible: { anio: number; trimestre: number },
  esperado: { anio: number; trimestre: number },
): boolean {
  return (
    disponible.anio > esperado.anio ||
    (disponible.anio === esperado.anio && disponible.trimestre >= esperado.trimestre)
  );
}
