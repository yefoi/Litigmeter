import type { TasasIndicadores } from "./tipos";

const PATRON_RESOLUCION =
  /Resoluci[oó]n(?:es)?\s+([\d.,]+)\s+([\d.,]+)\s+-?[\d.,]+%\s+([\d.,]+)\s+([\d.,]+)\s+-?[\d.,]+%/;
const PATRON_PENDENCIA = /Pendencia\s+([\d.,]+)\s+([\d.,]+)\s+-?[\d.,]+%/;
const PATRON_CONGESTION = /Congesti[oó]n\s+([\d.,]+)\s+([\d.,]+)\s+-?[\d.,]+%/;

function aNumero(valor: string | undefined): number | undefined {
  if (valor === undefined) return undefined;
  const limpio = valor.trim();
  if (!limpio) return undefined;
  const numero = limpio.includes(",")
    ? Number.parseFloat(limpio.replace(/\./g, "").replace(",", "."))
    : Number.parseFloat(limpio);
  return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Extrae las tasas de la primera página de un PDF de "Indicadores clave".
 * Columnas: año anterior, año actual y evolución; solo se usan las dos primeras.
 */
export function parsearIndicadoresPdf(textoPrimeraPagina: string): TasasIndicadores {
  const tasas: TasasIndicadores = {};

  const resolucion = textoPrimeraPagina.match(PATRON_RESOLUCION);
  if (resolucion) {
    tasas.resolucion_anio_anterior = aNumero(resolucion[1]);
    tasas.resolucion = aNumero(resolucion[2]);
    tasas.litigiosidad_anio_anterior = aNumero(resolucion[3]);
    tasas.litigiosidad = aNumero(resolucion[4]);
  }

  const pendencia = textoPrimeraPagina.match(PATRON_PENDENCIA);
  if (pendencia) {
    tasas.pendencia_anio_anterior = aNumero(pendencia[1]);
    tasas.pendencia = aNumero(pendencia[2]);
  }

  const congestion = textoPrimeraPagina.match(PATRON_CONGESTION);
  if (congestion) {
    tasas.congestion_anio_anterior = aNumero(congestion[1]);
    tasas.congestion = aNumero(congestion[2]);
  }

  if (Object.keys(tasas).length === 0) {
    throw new Error("No se encontraron tasas de resolucion, pendencia ni congestion");
  }
  return tasas;
}
