import { redactarDatosPersonales } from "./privacidad";
import type { EdictoClasificado, EvidenciaEdicto } from "./tipos";

function recortar(texto: string, maximo: number): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo);
  return `${corte.slice(0, corte.lastIndexOf(" "))}…`;
}

/**
 * Selecciona hasta `limite` edictos representativos, ordenados por relevancia
 * editorial y sin repetir tipo de procedimiento, como evidencia para el
 * clasificador trimestral. Devuelve solo `{ tipo_procedimiento, resumen }`:
 * el texto íntegro nunca sale de esta función y el resumen va redactado.
 */
export function seleccionarRepresentativos(
  edictos: EdictoClasificado[],
  limite = 3,
): EvidenciaEdicto[] {
  const tiposVistos = new Set<string>();
  return edictos
    .filter(({ clasificacion }) => clasificacion.es_representativo)
    .sort((a, b) => b.clasificacion.relevancia_editorial - a.clasificacion.relevancia_editorial)
    .filter(({ clasificacion }) => {
      if (tiposVistos.has(clasificacion.tipo_procedimiento)) return false;
      tiposVistos.add(clasificacion.tipo_procedimiento);
      return true;
    })
    .slice(0, limite)
    .map(({ edicto, clasificacion }) => ({
      tipo_procedimiento: clasificacion.tipo_procedimiento,
      resumen: `${edicto.organo_judicial}, ${edicto.fecha_publicacion}: ${recortar(
        redactarDatosPersonales(edicto.texto),
        200,
      )}`,
    }));
}
