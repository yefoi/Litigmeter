import type { Metadata } from "next";
import Link from "next/link";
import Logo from "../components/Logo";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Metodología · Litigmeter",
  description:
    "De dónde salen los datos de Litigmeter, cómo se procesan y clasifican, qué mide el índice, cómo se calculan las previsiones y qué límites tiene el proyecto.",
};

export default function Page() {
  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Metodología</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Metodología</h1>
          <p className={styles.subtitulo}>
            De dónde sale cada dato, cómo se procesa y qué no debe leerse en él.
          </p>
        </div>
      </header>

      <section className={styles.bloque}>
        <h2>Qué es Litigmeter</h2>
        <p>
          Un panel independiente sobre la litigiosidad judicial en España. Reutiliza datos
          públicos del Consejo General del Poder Judicial (CGPJ) y añade una capa de análisis:
          clasificación con IA, un índice propio, previsiones y alertas. No es una fuente
          oficial y no está afiliado al CGPJ.
        </p>
      </section>

      <section className={styles.bloque}>
        <h2>Fuentes de datos</h2>
        <ul className={styles.fichaCriterios}>
          <li>
            <strong>Notas de prensa trimestrales</strong> del CGPJ: de ahí salen la tasa de
            litigiosidad por comunidad (asuntos ingresados por cada 1.000 habitantes) desde
            2017, con la variación interanual y el texto de la nota.
          </li>
          <li>
            <strong>Indicadores clave</strong> por Tribunal Superior de Justicia: congestión,
            pendencia y resolución trimestrales para cada comunidad, con el mismo periodo del
            año anterior. Se extraen de los PDFs oficiales trimestre a trimestre.
          </li>
          <li>
            <strong>Series estadísticas anuales</strong> por TSJ y por provincia, desde 2001,
            para el histórico largo.
          </li>
          <li>
            <strong>Edictos judiciales</strong> del Tablón Edictal Judicial Único (TEJU): se
            usan como ejemplos reales de cada comunidad, con el texto saneado (sin nombres ni
            documentos) y solo para clasificar.
          </li>
        </ul>
      </section>

      <section className={styles.bloque}>
        <h2>Cómo se procesa</h2>
        <p>
          Un proceso automático se ejecuta los lunes: descarga las publicaciones nuevas, las
          valida con esquemas, enriquece cada comunidad con su histórico y clasifica los datos
          con IA. Todo queda versionado en el repositorio en ficheros JSON y cualquier cambio
          se puede auditar.
        </p>
      </section>

      <section className={styles.bloque}>
        <h2>La clasificación con IA</h2>
        <p>
          Para cada comunidad y trimestre, la IA responde tres preguntas con criterios
          explícitos: <strong>tendencia</strong> (mejora, estable o empeora),{" "}
          <strong>gravedad de la carga</strong> (de 1 a 5) y <strong>noticiable</strong> (si
          el dato merece destacarse, con su probabilidad). La ficha de cada comunidad muestra
          el estado exacto, los criterios y la confianza de cada respuesta.
        </p>
        <p>
          Es una ayuda a la lectura, no un dato oficial: la IA puede equivocarse y ciertos
          resultados (sobre todo con confianza baja) deben tomarse con cautela.
        </p>
      </section>

      <section className={styles.bloque}>
        <h2>Índice Litigmeter</h2>
        <p>
          Una nota propia de 0 a 100 por comunidad y trimestre: pondera el nivel de
          litigiosidad (40 %), la tendencia interanual (25 %), la congestión (20 %) y la
          pendencia (15 %). Si falta un componente porque el CGPJ no lo publica ese trimestre,
          los pesos se renormalizan entre los disponibles. Más alto significa más presión de
          carga.
        </p>
      </section>

      <section className={styles.bloque}>
        <h2>Previsión y alertas</h2>
        <p>
          La previsión del trimestre siguiente es un modelo transparente: estacional simple
          (mismo trimestre del año anterior) con una deriva amortiguada. El marcador compara
          cada previsión con el dato real cuando se publica (error medio absoluto y porcentaje
          de aciertos dentro del ±5 %).
        </p>
        <p>
          Las alertas destacan cambios de tendencia, saltos interanuales, extremos de la serie
          y diferencias con la media nacional. Se publican en la web y por RSS; el aviso por
          email es opcional.
        </p>
      </section>

      <section className={styles.bloque}>
        <h2>Límites conocidos</h2>
        <ul className={styles.fichaCriterios}>
          <li>
            No hay página oficial de indicadores de algunos trimestres (T4 de 2017-2019 y
            2022, y T2-T4 de 2025) ni de algunas comunidades en trimestres concretos (Madrid
            en 2024-T2, Asturias en 2025-T1): son huecos del CGPJ y se muestran como celdas
            vacías.
          </li>
          <li>
            El CGPJ revisa series: por ejemplo, la tasa nacional de 2025-T1 pasó de 40,07
            (en su nota) a 46,6 (en el informe de un año después). La página de reconciliación
            del repositorio deja constancia de estas diferencias.
          </li>
          <li>
            Los edictos solo son de acceso libre cuatro meses, así que la evidencia se captura
            de forma continua y nunca se guarda el texto completo.
          </li>
        </ul>
      </section>

      <section className={styles.bloque}>
        <h2>Licencia y cita</h2>
        <p>
          Los datos originales son públicos y se reutilizan con atribución al CGPJ. Si usas
          este análisis, cita «Litigmeter, a partir de datos del CGPJ» y enlaza a la fuente
          original de cada informe, disponible en el pie de cada comunidad.
        </p>
      </section>

      <footer className={styles.pie}>
        <p>
          ¿Detectas un error? Abre un aviso en el repositorio o usa{" "}
          <Link href="/contraste">el contraste de afirmaciones</Link>.{" "}
          <Link href="/">Volver al panel</Link>.
        </p>
      </footer>
    </main>
  );
}
