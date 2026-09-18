import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_evaluate } from "ai";
import { redactarDatosPersonales } from "./privacidad";
import type { ClasificacionEdicto, Edicto } from "./tipos";

type EstadoEvaluacion = Parameters<typeof experimental_evaluate>[0]["state"];

/**
 * jev recibe el edicto con el texto ya redactado: los identificadores
 * personales no salen del proceso ni se almacenan con la clasificación.
 */
function aEstadoJson(edicto: Edicto): EstadoEvaluacion {
  return JSON.parse(
    JSON.stringify({
      ...edicto,
      texto: redactarDatosPersonales(edicto.texto),
    }),
  ) as EstadoEvaluacion;
}

export async function clasificarEdicto(edicto: Edicto): Promise<ClasificacionEdicto> {
  const result = await experimental_evaluate({
    model: typeSafeAi.evaluationModel("jev-latest"),
    state: aEstadoJson(edicto),
    questions: {
      tipo_procedimiento: {
        type: "choice",
        instructions:
          "Clasifica la naturaleza de este edicto judicial según el órgano que lo emite " +
          "y el contenido del texto.",
        criteria: {
          civil: ["Juzgado de Primera Instancia", "herencias, desahucios, familia"],
          penal: ["Juzgado de Instrucción, de lo Penal o Audiencia Provincial (penal)"],
          social: ["Juzgado de lo Social", "despidos, prestaciones"],
          mercantil: ["Juzgado de lo Mercantil", "concursos, sociedades"],
          contencioso_administrativo: ["Juzgado o Sala de lo Contencioso-Administrativo"],
          otro: null,
        },
      },
      relevancia_editorial: {
        type: "score",
        instructions:
          "Evalúa, por el contenido del edicto y no por los datos personales, su interés " +
          "como caso ilustrativo para un resumen editorial sobre el estado de la justicia " +
          "en su comunidad autónoma.",
        criteria: [
          "Notificación rutinaria sin interés editorial (citación o requerimiento estándar).",
          "Trámite común que refleja la actividad ordinaria del órgano.",
          "Procedimiento con algún elemento singular, pero poco ilustrativo por sí solo.",
          "Procedimiento representativo de la carga del orden jurisdiccional en esa comunidad.",
          "Procedimiento muy ilustrativo (desahucio, concurso, despido colectivo, cláusula suelo…) y útil como evidencia de un resumen editorial.",
        ],
      },
      es_representativo: {
        type: "boolean",
        instructions:
          "¿Este edicto es un buen ejemplo del tipo de asuntos que se tramitan en su " +
          "comunidad autónoma y orden jurisdiccional durante el trimestre?",
        criteria: {
          true: "Asunto habitual del orden jurisdiccional en esa comunidad, con carga informativa suficiente.",
          false: "Notificación singular, anecdótica o sin relación con la carga de trabajo del orden.",
        },
      },
    },
  });

  const metadata = result.providerMetadata as unknown as
    | { typesafe?: { confidence?: Record<string, number> } }
    | undefined;

  return {
    tipo_procedimiento: result.answers.tipo_procedimiento.choice,
    relevancia_editorial: result.answers.relevancia_editorial.score,
    es_representativo: result.answers.es_representativo.probability > 0.6,
    probabilidad_representativo: result.answers.es_representativo.probability,
    confianza_tipo: metadata?.typesafe?.confidence?.tipo_procedimiento,
    confianza_relevancia: metadata?.typesafe?.confidence?.relevancia_editorial,
    modelo: result.response.modelId,
  };
}
