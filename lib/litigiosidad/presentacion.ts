import type { InformeTrimestral } from "@/lib/litigiosidad/tipos";

export function etiquetaTrimestre(informe: Pick<InformeTrimestral, "anio" | "trimestre">): string {
  return `T${informe.trimestre} ${String(informe.anio).slice(2)}`;
}

export interface PuntoSerie {
  etiqueta: string;
  tasa: number | null;
}

export const CLAVE_NACIONAL = "Media nacional";

export function seriePorComunidad(
  informes: InformeTrimestral[],
  comunidad: string,
): PuntoSerie[] {
  return informes.map((informe) => ({
    etiqueta: etiquetaTrimestre(informe),
    tasa:
      informe.comunidades.find((c) => c.comunidad_autonoma === comunidad)?.tasa_litigiosidad ??
      null,
  }));
}

export function serieNacional(informes: InformeTrimestral[]): PuntoSerie[] {
  return informes.map((informe) => ({
    etiqueta: etiquetaTrimestre(informe),
    tasa: informe.nacional.tasa_litigiosidad,
  }));
}

export function nombresDeComunidades(informes: InformeTrimestral[]): string[] {
  const vistos = new Map<string, number>();
  for (const informe of informes) {
    for (const comunidad of informe.comunidades) {
      const anterior = vistos.get(comunidad.comunidad_autonoma);
      if (anterior === undefined || comunidad.posicion_nacional < anterior) {
        vistos.set(comunidad.comunidad_autonoma, comunidad.posicion_nacional);
      }
    }
  }
  return [...vistos.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "es")).map(([nombre]) => nombre);
}

export function colorHeatmap(valor: number, minimo: number, maximo: number): string {
  if (!Number.isFinite(valor) || maximo === minimo) return "hsl(210 15% 45%)";
  const proporcion = Math.min(1, Math.max(0, (valor - minimo) / (maximo - minimo)));
  const tono = 130 - 130 * proporcion;
  return `hsl(${tono.toFixed(0)} 62% 42%)`;
}

export function formatearTasa(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  return valor.toFixed(1).replace(".", ",");
}

export function formatearPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "—";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${valor.toFixed(1).replace(".", ",")} %`;
}

export function etiquetaGravedad(puntuacion: number): string {
  const niveles = ["sin problema", "leve", "moderada", "alta", "crítica"];
  const indice = Math.min(niveles.length - 1, Math.max(0, Math.round(puntuacion)));
  return `${indice + 1}/5 ${niveles[indice]}`;
}
