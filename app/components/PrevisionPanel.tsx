import styles from "../page.module.css";
import { formatearTasa } from "@/lib/litigiosidad/presentacion";
import type { FicheroPrevisiones } from "@/lib/prevision";

function enPuntos(valor: number | undefined): string {
  if (valor === undefined) return "—";
  const signo = valor > 0 ? "+" : "";
  return `${signo}${valor.toFixed(1).replace(".", ",")} pts`;
}

export default function PrevisionPanel({
  previsiones,
  actual,
}: {
  previsiones: FicheroPrevisiones;
  actual: Record<string, number>;
}) {
  const ultima = previsiones.previsiones.at(-1);
  if (!ultima) return null;
  const ultimoAcierto = previsiones.aciertos.at(-1);

  const filas = Object.entries(ultima.comunidades)
    .map(([nombre, prediccion]) => {
      const tasaActual = actual[nombre];
      return {
        nombre,
        prevision: prediccion.tasa,
        delta: tasaActual !== undefined ? prediccion.tasa - tasaActual : undefined,
      };
    })
    .filter((fila) => fila.delta !== undefined)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  const suben = filas.slice(0, 3);
  const bajan = [...filas].slice(-3).reverse();

  return (
    <div>
      <section className={styles.resumenNacional}>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>
            Previsión nacional {ultima.anio}-T{ultima.trimestre}
          </span>
          <strong className={styles.datoValor}>{formatearTasa(ultima.nacional.tasa)}</strong>
          <span className={styles.datoDetalle}>
            estimada desde {ultima.generado_desde}
          </span>
        </article>
        {ultimoAcierto ? (
          <>
            <article className={styles.dato}>
              <span className={styles.datoTitulo}>Error medio absoluto</span>
              <strong className={styles.datoValor}>
                {ultimoAcierto.error_medio.toFixed(2).replace(".", ",")}
              </strong>
              <span className={styles.datoDetalle}>
                puntos, {ultimoAcierto.anio}-T{ultimoAcierto.trimestre}
              </span>
            </article>
            <article className={styles.dato}>
              <span className={styles.datoTitulo}>Dentro del ±5 %</span>
              <strong className={styles.datoValor}>
                {ultimoAcierto.dentro_5pct}/{ultimoAcierto.total}
              </strong>
              <span className={styles.datoDetalle}>comunidades acertadas</span>
            </article>
          </>
        ) : null}
      </section>

      <div className={styles.previsionListas}>
        <div>
          <h3 className={styles.previsionTitulo}>Mayores subidas previstas</h3>
          <ul className={styles.fichaCriterios}>
            {suben.map((fila) => (
              <li key={fila.nombre}>
                <strong>{fila.nombre}</strong>: {formatearTasa(fila.prevision)} (
                {enPuntos(fila.delta)} vs actual)
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.previsionTitulo}>Mayores bajadas previstas</h3>
          <ul className={styles.fichaCriterios}>
            {bajan.map((fila) => (
              <li key={fila.nombre}>
                <strong>{fila.nombre}</strong>: {formatearTasa(fila.prevision)} (
                {enPuntos(fila.delta)} vs actual)
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className={styles.nota}>
        Método: estacional simple (mismo trimestre del año anterior) con deriva amortiguada
        (mitad de la variación interanual reciente). El marcador compara cada previsión con el
        dato real cuando el CGPJ lo publica.
      </p>
    </div>
  );
}
