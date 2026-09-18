import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_evaluate } from "ai";
import { esNoticiable } from "./noticiabilidad";
import { PREGUNTAS_LITIGIOSIDAD } from "./preguntas";
import type { ClasificacionLitigiosidad, DatoTrimestral } from "./tipos";

type EstadoEvaluacion = Parameters<typeof experimental_evaluate>[0]["state"];

/** jev exige JSON puro: elimina claves undefined y garantiza el tipo. */
function aEstadoJson(dato: DatoTrimestral): EstadoEvaluacion {
  return JSON.parse(JSON.stringify(dato)) as EstadoEvaluacion;
}

/**
 * Clasifica un dato trimestral de litigiosidad con el modelo jev de TypeSafe AI
 * a través del AI SDK (`experimental_evaluate`, AI SDK >= 7.0.105, Node >= 22).
 *
 * Convenciones del provider:
 * - `choice` devuelve `choice` + `probabilities` + confianza en providerMetadata.
 * - `score` devuelve una posición fraccionaria 0..niveles-1 (aquí 0–4).
 * - `boolean` mapea al primitivo Noul y devuelve `probability` = P(true).
 */
export async function clasificarTrimestre(
  dato: DatoTrimestral,
): Promise<ClasificacionLitigiosidad> {
  const result = await experimental_evaluate({
    model: typeSafeAi.evaluationModel("jev-latest"),
    state: aEstadoJson(dato),
    questions: PREGUNTAS_LITIGIOSIDAD,
  });

  const metadata = result.providerMetadata as unknown as
    | { typesafe?: { confidence?: Record<string, number> } }
    | undefined;

  return {
    tendencia: result.answers.tendencia.choice,
    gravedad_congestion: result.answers.gravedad_congestion.score,
    es_noticiable: esNoticiable(result.answers.es_noticiable.probability),
    probabilidad_noticiable: result.answers.es_noticiable.probability,
    confianza_tendencia: metadata?.typesafe?.confidence?.tendencia,
    confianza_gravedad: metadata?.typesafe?.confidence?.gravedad_congestion,
    modelo: result.response.modelId,
  };
}
