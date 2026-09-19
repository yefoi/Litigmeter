import type { ReactNode } from "react";
import styles from "../page.module.css";

interface Pregunta {
  pregunta: string;
  respuesta: ReactNode;
}

const PREGUNTAS: Pregunta[] = [
  {
    pregunta: "¿Qué mide la tasa de litigiosidad?",
    respuesta: (
      <p>
        Los asuntos de nuevo ingreso por cada 1.000 habitantes en el trimestre. La calcula el
        CGPJ con la población del INE. No mide duración de los procedimientos ni congestión:
        solo la entrada de carga en los órganos judiciales.
      </p>
    ),
  },
  {
    pregunta: "¿De dónde salen los datos y cada cuánto se actualizan?",
    respuesta: (
      <>
        <p>
          De las notas de prensa trimestrales del CGPJ. La ingesta se ejecuta sola todos los
          lunes y publica cuando aparece una nota nueva, normalmente 3–4 meses después de
          cerrar el trimestre (T1 a finales de junio, T2 en octubre, T3 en diciembre y T4 en
          marzo).
        </p>
        <p>
          Las series históricas completas están en{" "}
          <a
            href="https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Informes-por-territorios-sobre-la-actividad-de-los-organos-judiciales"
            target="_blank"
            rel="noopener noreferrer"
          >
            Informes por territorios
          </a>{" "}
          del CGPJ.
        </p>
      </>
    ),
  },
  {
    pregunta: "¿Por qué algunas celdas aparecen vacías?",
    respuesta: (
      <p>
        Porque el CGPJ no publicó esa tasa en su nota: ocurre con País Vasco en 2025-T1 y con
        La Rioja en 2025-T2. No se estiman valores que la fuente no da.
      </p>
    ),
  },
  {
    pregunta: "¿Qué significan las columnas Tendencia, Gravedad y Noticiable?",
    respuesta: (
      <p>
        Las estima una IA a partir de la tasa, su histórico y el texto
        de la nota: tendencia (mejora / estable / empeora), gravedad de la carga en 5 niveles
        (sin problema → crítica) y si el dato es lo bastante inusual como para destacarlo
        (probabilidad mayor que 0,6). Son indicadores orientativos: no sustituyen al dato
        oficial.
      </p>
    ),
  },
  {
    pregunta: "¿Puedo comprobar una afirmación concreta?",
    respuesta: (
      <p>
        Sí: en <a href="/contraste">Contraste de afirmaciones</a> puedes pegar una frase (de
        una noticia, un informe o una red social) y la IA la compara con los últimos datos
        publicados, devolviendo veredicto, ámbito, confianza y la evidencia numérica.
      </p>
    ),
  },
  {
    pregunta: "¿Qué es el índice Litigmeter?",
    respuesta: (
      <p>
        Un indicador propio de presión judicial de 0 a 100 por comunidad y trimestre:
        pondera el nivel de litigiosidad (40 %), la tendencia interanual (25 %), la
        congestión (20 %) y la pendencia (15 %). Si falta algún componente —porque el
        CGPJ no lo publica ese trimestre—, los pesos se renormalizan entre los
        disponibles. No sustituye al dato oficial: sirve para comparar y ordenar
        comunidades de forma transparente.
      </p>
    ),
  },
  {
    pregunta: "¿Qué significa cada columna de la tabla?",
    respuesta: (
      <ul>
        <li>
          <strong>Tasa</strong>: asuntos nuevos que entran en los juzgados por cada 1.000
          habitantes. Cuanto más alta, más carga reciben.
        </li>
        <li>
          <strong>vs media</strong>: diferencia en puntos con la media nacional. Positivo
          significa que está por encima.
        </li>
        <li>
          <strong>Interanual</strong>: cuánto ha subido o bajado respecto al mismo trimestre del
          año anterior.
        </li>
        <li>
          <strong>Índice</strong>: nota propia de 0 a 100 que combina nivel, tendencia,
          congestión y pendencia. Más alto = más presión.
        </li>
        <li>
          <strong>Tendencia</strong>: mejora / estable / empeora respecto al trimestre anterior.
        </li>
        <li>
          <strong>Gravedad</strong>: de 1 (sin problema) a 5 (crítica), comparando con España y
          con su propia historia.
        </li>
        <li>
          <strong>Confianza</strong>: cómo de segura está la IA de su respuesta. Por debajo del
          50 %, tómalo con cautela.
        </li>
        <li>
          <strong>Noticiable</strong>: si el dato es lo bastante inusual como para destacarlo,
          con la probabilidad que le da la IA.
        </li>
      </ul>
    ),
  },
  {
    pregunta: "¿Gravedad es lo mismo que congestión judicial?",
    respuesta: (
      <p>
        Ahora la gravedad se apoya en la congestión, la pendencia y la resolución reales que
        publica el CGPJ en sus indicadores clave del trimestre. Solo cuando esos indicadores
        no están disponibles se usa la litigiosidad como indicador de presión de carga.
      </p>
    ),
  },
  {
    pregunta: "¿Cómo se calculan «vs media» e «interanual»?",
    respuesta: (
      <p>
        «vs media» es la diferencia en puntos entre la tasa de la comunidad y la nacional.
        «Interanual» compara con la tasa del mismo trimestre del año anterior cuando está
        disponible; si aún no hay histórico en el repositorio, queda vacío.
      </p>
    ),
  },
  {
    pregunta: "¿Es una fuente oficial?",
    respuesta: (
      <p>
        No: Litigmeter es un proyecto independiente y no está afiliado al CGPJ. Reutiliza sus
        notas y estadísticas, pensadas para difusión pública; cita siempre al CGPJ como
        fuente original.
      </p>
    ),
  },
];

export default function Faq() {
  return (
    <section className={styles.bloque}>
      <h2>Preguntas frecuentes</h2>
      <div className={styles.faq}>
        {PREGUNTAS.map((item) => (
          <details key={item.pregunta} className={styles.faqItem}>
            <summary>{item.pregunta}</summary>
            <div className={styles.faqRespuesta}>{item.respuesta}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
