import styles from "../page.module.css";
import type { ResumenEditorial } from "@/lib/editorial/tipos";

export default function Editorial({ resumen }: { resumen: ResumenEditorial }) {
  return (
    <section className={styles.bloque}>
      <h2>Resumen editorial</h2>
      <p className={styles.editorialTitular}>{resumen.titular}</p>
      <p className={styles.editorialEntradilla}>{resumen.entradilla}</p>
      <ul className={styles.destacados}>
        {resumen.destacados.map((destacado) => (
          <li key={destacado.comunidad_autonoma}>
            <span className={styles.destacadoCabecera}>
              <strong>{destacado.comunidad_autonoma}</strong> · {destacado.tendencia} · gravedad{" "}
              {destacado.gravedad}
            </span>
            <span className={styles.destacadoDetalle}>{destacado.detalle}</span>
            {destacado.evidencia ? (
              <span className={styles.destacadoEvidencia}>{destacado.evidencia}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className={styles.nota}>
        El foco lo elige la IA entre los candidatos que ordena el código; el texto se compone con
        plantillas y los datos del último informe.
      </p>
    </section>
  );
}
