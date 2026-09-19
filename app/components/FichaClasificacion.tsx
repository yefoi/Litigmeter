import styles from "../page.module.css";
import type { TasasIndicadores } from "@/lib/indicadores/tipos";
import type { EvidenciaEdicto } from "@/lib/edictos/tipos";
import {
  etiquetaGravedad,
  formatearConfianza,
  formatearPorcentaje,
  formatearTasa,
  confianzaMinima,
} from "@/lib/litigiosidad/presentacion";
import { umbralNoticiable } from "@/lib/litigiosidad/noticiabilidad";
import { PREGUNTAS_LITIGIOSIDAD } from "@/lib/litigiosidad/preguntas";
import type { ClasificacionLitigiosidad, RegistroComunidad } from "@/lib/litigiosidad/tipos";

function numero(valor: number | undefined, decimales = 2): string {
  if (valor === undefined) return "—";
  return valor.toFixed(decimales).replace(".", ",");
}

interface DatoExplicado {
  etiqueta: string;
  valor: string;
  ayuda: string;
}

export default function FichaClasificacion({
  registro,
  clasificacion,
  indicadores,
  evidencias,
}: {
  registro: RegistroComunidad;
  clasificacion: ClasificacionLitigiosidad;
  indicadores?: TasasIndicadores;
  evidencias?: EvidenciaEdicto[];
}) {
  const criteriosTendencia = Object.entries(PREGUNTAS_LITIGIOSIDAD.tendencia.criteria);
  const criteriosGravedad = PREGUNTAS_LITIGIOSIDAD.gravedad_congestion.criteria;
  const umbral = umbralNoticiable();
  const ninoSeleccionado = Math.round(clasificacion.gravedad_congestion);

  const datos: DatoExplicado[] = [
    {
      etiqueta: "Tasa de litigiosidad",
      valor: formatearTasa(registro.tasa_litigiosidad),
      ayuda: "Asuntos nuevos que entran en los juzgados por cada 1.000 habitantes. Cuanto más alta, más carga.",
    },
    {
      etiqueta: "Trimestre anterior",
      valor:
        registro.tasa_litigiosidad_trimestre_anterior !== undefined
          ? formatearTasa(registro.tasa_litigiosidad_trimestre_anterior)
          : "—",
      ayuda: "El mismo dato del trimestre anterior, para poder comparar.",
    },
    {
      etiqueta: "Variación interanual",
      valor: formatearPorcentaje(registro.variacion_interanual_pct),
      ayuda: "Cuánto ha subido o bajado respecto al mismo trimestre del año pasado.",
    },
    {
      etiqueta: "Congestión",
      valor:
        indicadores?.congestion !== undefined
          ? `${numero(indicadores.congestion)}${indicadores.congestion_anio_anterior !== undefined ? ` (año anterior ${numero(indicadores.congestion_anio_anterior)})` : ""}`
          : "sin indicador",
      ayuda: "Mide si el trabajo se acumula: por encima de 1, entra más de lo que se resuelve.",
    },
    {
      etiqueta: "Pendencia",
      valor:
        indicadores?.pendencia !== undefined
          ? `${numero(indicadores.pendencia)}${indicadores.pendencia_anio_anterior !== undefined ? ` (año anterior ${numero(indicadores.pendencia_anio_anterior)})` : ""}`
          : "sin indicador",
      ayuda: "Asuntos que quedan sin resolver al final del periodo en relación con los resueltos.",
    },
    {
      etiqueta: "Resolución",
      valor:
        indicadores?.resolucion !== undefined
          ? `${numero(indicadores.resolucion)}${indicadores.resolucion_anio_anterior !== undefined ? ` (año anterior ${numero(indicadores.resolucion_anio_anterior)})` : ""}`
          : "sin indicador",
      ayuda: "Asuntos resueltos por cada uno que entra: cuanto más cerca de 1 (o por encima), mejor.",
    },
  ];

  return (
    <section className={styles.bloque}>
      <h2>Cómo lo clasifica la IA</h2>
      <p className={styles.nota}>
        Aquí tienes, en lenguaje sencillo, qué datos se usaron y qué significa la respuesta.
        Confianza mínima: {formatearConfianza(confianzaMinima(clasificacion))}.
      </p>

      <div className={styles.fichaRejilla}>
        <article className={styles.fichaTarjeta}>
          <h3>Tendencia</h3>
          <p className={styles.fichaRespuesta}>{clasificacion.tendencia}</p>
          <p className={styles.fichaDetalle}>
            Resume si la carga está bajando (mejora), más o menos igual (estable) o subiendo
            (empeora) respecto al trimestre anterior.
          </p>
          <ul className={styles.fichaCriterios}>
            {criteriosTendencia.map(([opcion, descripcion]) => (
              <li
                key={opcion}
                className={opcion === clasificacion.tendencia ? styles.fichaCriterioActivo : undefined}
              >
                <strong>{opcion}</strong>: {descripcion}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.fichaTarjeta}>
          <h3>Gravedad de la carga</h3>
          <p className={styles.fichaRespuesta}>
            {etiquetaGravedad(clasificacion.gravedad_congestion)}
          </p>
          <p className={styles.fichaDetalle}>
            Resume cómo de cargados están los juzgados comparando con la media de España y con
            su propia historia, de 1 (sin problema) a 5 (crítica).
          </p>
          <ol className={styles.fichaCriterios}>
            {criteriosGravedad.map((descripcion, indice) => (
              <li
                key={descripcion}
                className={indice === ninoSeleccionado ? styles.fichaCriterioActivo : undefined}
              >
                {descripcion}
              </li>
            ))}
          </ol>
        </article>

        <article className={styles.fichaTarjeta}>
          <h3>Noticiable</h3>
          <p className={styles.fichaRespuesta}>
            {clasificacion.es_noticiable ? "sí" : "no"}
          </p>
          <p className={styles.fichaDetalle}>
            Dice si el dato es lo bastante llamativo como para destacarlo en un resumen.
          </p>
          <p className={styles.fichaDetalle}>
            P(true) es la probabilidad (0-100 %) que le pone la IA; el umbral es el mínimo para
            decir «sí». La confianza mide cómo de segura está de su respuesta: por debajo del
            50 %, tómalo con cautela.
          </p>
          <p className={styles.fichaDetalle}>
            P(true) = {formatearConfianza(clasificacion.probabilidad_noticiable)} · umbral{" "}
            {umbral.toFixed(2).replace(".", ",")}
          </p>
          <p className={styles.fichaDetalle}>
            Confianza tendencia {formatearConfianza(clasificacion.confianza_tendencia)} ·
            gravedad {formatearConfianza(clasificacion.confianza_gravedad)}
          </p>
        </article>
      </div>

      <div className={styles.fichaDatos}>
        <h3>Datos que vio la IA</h3>
        <dl>
          {datos.map((dato) => (
            <div key={dato.etiqueta}>
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
              <span className={styles.fichaAyuda}>{dato.ayuda}</span>
            </div>
          ))}
        </dl>
      </div>

      {evidencias && evidencias.length > 0 ? (
        <div className={styles.fichaDatos}>
          <h3>Evidencia de edictos (saneada)</h3>
          <p className={styles.fichaAyuda}>
            Casos reales publicados en el tablón de edictos, sin datos personales, usados como
            ejemplo del tipo de asuntos que se tramitan.
          </p>
          <ul className={styles.fichaEvidencias}>
            {evidencias.map((evidencia, indice) => (
              <li key={`${evidencia.tipo_procedimiento}-${indice}`}>
                <strong>{evidencia.tipo_procedimiento}</strong>: {evidencia.resumen}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
