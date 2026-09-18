export interface MuestraCalibracion {
  probabilidad: number;
  etiqueta: boolean;
}

export interface MetricasUmbral {
  umbral: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
  exactitud: number;
}

export const UMBRALES_CALIBRACION = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9];

export function metricasPorUmbral(
  muestras: MuestraCalibracion[],
  umbral: number,
): MetricasUmbral {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const muestra of muestras) {
    const predicho = muestra.probabilidad > umbral;
    if (predicho && muestra.etiqueta) tp++;
    else if (predicho) fp++;
    else if (muestra.etiqueta) fn++;
    else tn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const exactitud = muestras.length > 0 ? (tp + tn) / muestras.length : 0;
  return { umbral, tp, fp, tn, fn, precision, recall, f1, exactitud };
}

export function curvaUmbrales(
  muestras: MuestraCalibracion[],
  umbrales: number[] = UMBRALES_CALIBRACION,
): MetricasUmbral[] {
  return umbrales.map((umbral) => metricasPorUmbral(muestras, umbral));
}

export function mejorUmbral(
  muestras: MuestraCalibracion[],
  umbrales: number[] = UMBRALES_CALIBRACION,
): MetricasUmbral | undefined {
  if (muestras.length === 0) return undefined;
  return curvaUmbrales(muestras, umbrales).reduce((mejor, actual) =>
    actual.f1 > mejor.f1 || (actual.f1 === mejor.f1 && actual.umbral > mejor.umbral)
      ? actual
      : mejor,
  );
}

export function claveMuestra(anio: number, trimestre: number, comunidad: string): string {
  return `${anio}-T${trimestre}|${comunidad}`;
}

function partirCsv(linea: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let indice = 0; indice < linea.length; indice++) {
    const caracter = linea[indice];
    if (entreComillas) {
      if (caracter === '"' && linea[indice + 1] === '"') {
        actual += '"';
        indice++;
      } else if (caracter === '"') {
        entreComillas = false;
      } else {
        actual += caracter;
      }
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === ",") {
      campos.push(actual);
      actual = "";
    } else {
      actual += caracter;
    }
  }
  campos.push(actual);
  return campos;
}

const VALORES_SI = new Set(["1", "true", "si", "sí", "s", "y", "yes"]);

export function leerEtiquetasCsv(contenido: string): Map<string, boolean> {
  const etiquetas = new Map<string, boolean>();
  const lineas = contenido.split(/\r?\n/).filter((linea) => linea.trim().length > 0);
  if (lineas.length === 0) return etiquetas;

  const cabecera = partirCsv(lineas[0]).map((campo) => campo.trim());
  const idxEtiqueta = cabecera.indexOf("etiqueta_humana");
  const idxAnio = cabecera.indexOf("anio");
  const idxTrimestre = cabecera.indexOf("trimestre");
  const idxComunidad = cabecera.indexOf("comunidad_autonoma");
  if ([idxEtiqueta, idxAnio, idxTrimestre, idxComunidad].some((indice) => indice < 0)) {
    return etiquetas;
  }

  for (const linea of lineas.slice(1)) {
    const campos = partirCsv(linea);
    const valor = (campos[idxEtiqueta] ?? "").trim().toLowerCase();
    if (!valor) continue;
    etiquetas.set(
      claveMuestra(Number(campos[idxAnio]), Number(campos[idxTrimestre]), campos[idxComunidad]),
      VALORES_SI.has(valor),
    );
  }
  return etiquetas;
}
