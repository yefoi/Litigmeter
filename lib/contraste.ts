import { typeSafeAi } from "@ai-sdk/typesafe-ai";
import { experimental_evaluate } from "ai";
import { COMUNIDADES } from "./litigiosidad/ccaa";
import { etiquetaTrimestre, formatearPorcentaje, formatearTasa } from "./litigiosidad/presentacion";
import type { InformeTrimestral } from "./litigiosidad/tipos";

type EstadoEvaluacion = Parameters<typeof experimental_evaluate>[0]["state"];

export const VEREDICTOS = {
  respaldada: "Los datos disponibles apoyan la afirmación tal y como está formulada.",
  contradicha: "Los datos disponibles muestran lo contrario de lo que afirma.",
  matizable: "La afirmación es parcialmente cierta o depende del periodo o la métrica elegida.",
  sin_datos: "La afirmación no se puede comprobar con los datos cargados (periodo, materia o ámbito no cubiertos).",
} as const;

export type Veredicto = keyof typeof VEREDICTOS;

export const VEREDICTOS_VALIDOS = Object.keys(VEREDICTOS) as Veredicto[];

export interface Contraste {
  veredicto: Veredicto;
  confianza?: number;
  ambito: string;
  evidencia: string;
}

export function validarAfirmacion(texto: string): string | undefined {
  const limpio = texto.trim();
  if (limpio.length < 10) return "La afirmación es demasiado corta (mínimo 10 caracteres).";
  if (limpio.length > 500) return "La afirmación no puede superar los 500 caracteres.";
  return undefined;
}

export function construirEstado(informes: InformeTrimestral[]): EstadoEvaluacion | undefined {
  if (informes.length === 0) return undefined;
  const estado = {
    informes: informes.slice(-4).map((informe) => ({
      periodo: etiquetaTrimestre(informe),
      nacional: informe.nacional,
      comunidades: informe.comunidades.map((comunidad) => ({
        comunidad_autonoma: comunidad.comunidad_autonoma,
        tasa_litigiosidad: comunidad.tasa_litigiosidad,
        variacion_interanual_pct: comunidad.variacion_interanual_pct,
        posicion_nacional: comunidad.posicion_nacional,
      })),
    })),
  };
  return JSON.parse(JSON.stringify(estado)) as EstadoEvaluacion;
}

export function evidenciaDe(ambito: string, informes: InformeTrimestral[]): string {
  const ultimo = informes.at(-1);
  if (!ultimo) return "Sin datos cargados.";
  if (ambito === "Nacional") {
    return (
      `${etiquetaTrimestre(ultimo)} · media nacional: ` +
      `${formatearTasa(ultimo.nacional.tasa_litigiosidad)} asuntos por 1.000 habitantes ` +
      `(${formatearPorcentaje(ultimo.nacional.variacion_interanual_pct)} interanual).`
    );
  }
  const registro = ultimo.comunidades.find(
    (comunidad) => comunidad.comunidad_autonoma === ambito,
  );
  if (!registro) {
    return `Sin datos de ${ambito} en ${etiquetaTrimestre(ultimo)}.`;
  }
  return (
    `${ambito} · ${etiquetaTrimestre(ultimo)}: ` +
    `${formatearTasa(registro.tasa_litigiosidad)} asuntos por 1.000 habitantes ` +
    `(posición ${registro.posicion_nacional}, ${formatearPorcentaje(registro.variacion_interanual_pct)} interanual).`
  );
}

export async function contrastarAfirmacion(
  afirmacion: string,
  informes: InformeTrimestral[],
): Promise<Contraste> {
  const estado = construirEstado(informes);
  if (!estado) throw new Error("No hay datos para contrastar");

  const result = await experimental_evaluate({
    model: typeSafeAi.evaluationModel("jev-latest"),
    state: estado,
    questions: {
      veredicto: {
        type: "choice",
        instructions:
          "Contrasta la afirmación `afirmacion` del estado con los datos de `informes`. " +
          "Elige el veredicto que mejor describa la relación entre la afirmación y los datos.",
        criteria: { ...VEREDICTOS },
      },
      ambito: {
        type: "choice",
        instructions:
          "¿A qué ámbito territorial se refiere la afirmación? Elige 'Ninguna' si no se " +
          "puede determinar o no corresponde a ninguna comunidad ni al conjunto nacional.",
        criteria: Object.fromEntries(
          ["Nacional", ...COMUNIDADES.map((comunidad) => comunidad.nombre), "Ninguna"].map(
            (opcion) => [opcion, null],
          ),
        ),
      },
    },
  });

  const metadata = result.providerMetadata as unknown as
    | { typesafe?: { confidence?: Record<string, number> } }
    | undefined;
  const ambito = result.answers.ambito.choice;

  return {
    veredicto: result.answers.veredicto.choice,
    confianza: metadata?.typesafe?.confidence?.veredicto,
    ambito,
    evidencia:
      ambito === "Ninguna"
        ? "No se pudo asociar la afirmación a un ámbito concreto."
        : evidenciaDe(ambito, informes),
  };
}
