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

  const datos: Array<[string, string]> = [
    ["Tasa de litigiosidad", formatearTasa(registro.tasa_litigiosidad)],
    [
      "Trimestre anterior",
      registro.tasa_litigiosidad_trimestre_anterior !== undefined
        ? formatearTasa(registro.tasa_litigiosidad_trimestre_anterior)
        : "—",
    ],
    ["Variación interanual", formatearPorcentaje(registro.variacion_interanual_pct)],
    [
      "Congestión",
      indicadores?.congestion !== undefined
        ? `${numero(indicadores.congestion)}${indicadores.congestion_anio_anterior !== undefined ? ` (año anterior ${numero(indicadores.congestion_anio_anterior)})` : ""}`
        : "sin indicador",
    ],
    [
      "Pendencia",
      indicadores?.pendencia !== undefined
        ? `${numero(indicadores.pendencia)}${indicadores.pendencia_anio_anterior !== undefined ? ` (año anterior ${numero(indicadores.pendencia_anio_anterior)})` : ""}`
        : "sin indicador",
    ],
    [
      "Resolución",
      indicadores?.resolucion !== undefined
        ? `${numero(indicadores.resolucion)}${indicadores.resolucion_anio_anterior !== undefined ? ` (año anterior ${numero(indicadores.resolucion_anio_anterior)})` : ""}`
        : "sin indicador",
    ],
  ];

  return (
    <section className={styles.bloque}>
      <h2>Cómo lo clasifica jev</h2>
      <p className={styles.nota}>
        Estado que recibe el modelo, criterios de cada pregunta y respuesta. Confianza
        mínima: {formatearConfianza(confianzaMinima(clasificacion))}.
      </p>

      <div className={styles.fichaRejilla}>
        <article className={styles.fichaTarjeta}>
          <h3>Tendencia</h3>
          <p className={styles.fichaRespuesta}>{clasificacion.tendencia}</p>
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
        <h3>Datos que vio el modelo</h3>
        <dl>
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      {evidencias && evidencias.length > 0 ? (
        <div className={styles.fichaDatos}>
          <h3>Evidencia de edictos (saneada)</h3>
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
