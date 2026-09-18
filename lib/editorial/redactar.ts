import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_evaluate } from "ai";
import type { EvidenciaEdicto } from "../edictos/tipos";
import {
  etiquetaGravedad,
  formatearPorcentaje,
  formatearTasa,
} from "../litigiosidad/presentacion";
import type { InformeTrimestral, RegistroComunidad } from "../litigiosidad/tipos";
import type { DestacadoEditorial, ResumenEditorial } from "./tipos";

type EstadoEvaluacion = Parameters<typeof experimental_evaluate>[0]["state"];

/** jev exige JSON puro: elimina claves undefined y garantiza el tipo. */
function aEstadoJson(estado: unknown): EstadoEvaluacion {
  return JSON.parse(JSON.stringify(estado)) as EstadoEvaluacion;
}

function fraseVariacion(variacion: number | undefined): string {
  if (variacion === undefined) return "sin variación interanual disponible";
  if (Math.abs(variacion) < 0.5) return "se mantiene estable";
  const absoluto = Math.abs(variacion).toFixed(1).replace(".", ",");
  return `${variacion < 0 ? "baja" : "sube"} un ${absoluto} %`;
}

function tasaConDosDecimales(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

export function candidatosEditorial(
  informe: InformeTrimestral,
  limite = 5,
): RegistroComunidad[] {
  return [...informe.comunidades]
    .filter((registro) => registro.clasificacion)
    .sort((a, b) => {
      const noticiable =
        Number(b.clasificacion?.es_noticiable ?? false) -
        Number(a.clasificacion?.es_noticiable ?? false);
      if (noticiable !== 0) return noticiable;
      const gravedad =
        (b.clasificacion?.gravedad_congestion ?? 0) -
        (a.clasificacion?.gravedad_congestion ?? 0);
      if (gravedad !== 0) return gravedad;
      return (
        (b.clasificacion?.probabilidad_noticiable ?? 0) -
        (a.clasificacion?.probabilidad_noticiable ?? 0)
      );
    })
    .slice(0, limite);
}

/** jev elige el foco editorial entre los candidatos que ya ha ordenado el código. */
export async function elegirFoco(
  informe: InformeTrimestral,
  candidatos: RegistroComunidad[],
): Promise<RegistroComunidad | undefined> {
  if (candidatos.length === 0) return undefined;
  if (!process.env.TYPESAFE_AI_API_KEY?.trim()) return candidatos[0];

  const criteria: Record<string, string> = {};
  for (const candidato of candidatos) {
    const clasificacion = candidato.clasificacion;
    criteria[candidato.comunidad_autonoma] =
      `${formatearTasa(candidato.tasa_litigiosidad)} asuntos/1.000 hab.; ` +
      `tendencia ${clasificacion?.tendencia ?? "sin dato"}; ` +
      `gravedad ${clasificacion ? etiquetaGravedad(clasificacion.gravedad_congestion) : "sin dato"}` +
      `${clasificacion?.es_noticiable ? "; marcada como noticiable" : ""}`;
  }

  try {
    const resultado = await experimental_evaluate({
      model: typeSafeAi.evaluationModel("jev-latest"),
      state: aEstadoJson({
        anio: informe.anio,
        trimestre: informe.trimestre,
        nacional: informe.nacional,
        candidatos: candidatos.map((candidato) => ({
          comunidad_autonoma: candidato.comunidad_autonoma,
          tasa_litigiosidad: candidato.tasa_litigiosidad,
          clasificacion: candidato.clasificacion,
        })),
      }),
      questions: {
        foco: {
          type: "choice",
          instructions:
            "Elige la comunidad autónoma que debe abrir el resumen editorial del " +
            "trimestre por ser el caso más relevante o inusual.",
          criteria,
        },
      },
    });
    const elegida = resultado.answers.foco.choice;
    return candidatos.find((c) => c.comunidad_autonoma === elegida) ?? candidatos[0];
  } catch {
    return candidatos[0];
  }
}

export function redactarEditorial(
  informe: InformeTrimestral,
  foco: RegistroComunidad | undefined,
  evidencias: Record<string, EvidenciaEdicto[]> = {},
): ResumenEditorial {
  const nacional = informe.nacional;
  const titular = foco
    ? `La litigiosidad en ${foco.comunidad_autonoma} ${fraseVariacion(foco.variacion_interanual_pct)}`
    : `La litigiosidad nacional ${fraseVariacion(nacional.variacion_interanual_pct)}`;

  const noticiables = informe.comunidades.filter((c) => c.clasificacion?.es_noticiable);
  const porEncima = informe.comunidades.filter(
    (c) => c.tasa_litigiosidad > nacional.tasa_litigiosidad,
  ).length;
  const entradilla =
    `La tasa nacional fue de ${tasaConDosDecimales(nacional.tasa_litigiosidad)} asuntos por ` +
    `1.000 habitantes (${formatearPorcentaje(nacional.variacion_interanual_pct)} interanual). ` +
    `${porEncima} de ${informe.comunidades.length} comunidades superaron la media` +
    `${noticiables.length > 0 ? ` y ${noticiables.length} quedaron marcadas como noticiables` : ""}.`;

  const candidatos = candidatosEditorial(informe);
  const seleccion = [foco, ...candidatos.filter((c) => c !== foco)]
    .filter((registro): registro is RegistroComunidad => registro !== undefined)
    .slice(0, 3);

  const destacados: DestacadoEditorial[] = seleccion.map((registro) => ({
    comunidad_autonoma: registro.comunidad_autonoma,
    tendencia: registro.clasificacion?.tendencia ?? "sin dato",
    gravedad: registro.clasificacion
      ? etiquetaGravedad(registro.clasificacion.gravedad_congestion)
      : "sin dato",
    detalle: `${tasaConDosDecimales(registro.tasa_litigiosidad)} asuntos/1.000 hab. (${formatearPorcentaje(
      registro.variacion_interanual_pct,
    )} interanual)`,
    evidencia: evidencias[registro.comunidad_autonoma]?.[0]?.resumen,
  }));

  return {
    version_esquema: 1,
    anio: informe.anio,
    trimestre: informe.trimestre,
    generado_en: new Date().toISOString(),
    titular,
    entradilla,
    foco: destacados[0],
    destacados,
    fuente: { url: informe.fuente.url, titulo: informe.fuente.titulo },
  };
}
