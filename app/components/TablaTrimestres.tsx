import styles from "../page.module.css";
import {
  confianzaMinima,
  etiquetaGravedad,
  etiquetaTrimestre,
  formatearConfianza,
  formatearPorcentaje,
  formatearTasa,
} from "@/lib/litigiosidad/presentacion";
import type { InformeTrimestral, Tendencia } from "@/lib/litigiosidad/tipos";

const CLASE_TENDENCIA: Record<Tendencia, string> = {
  mejora: "tendenciaMejora",
  estable: "tendenciaEstable",
  empeora: "tendenciaEmpeora",
};

export default function TablaTrimestres({
  informes,
  comunidad,
}: {
  informes: InformeTrimestral[];
  comunidad: string;
}) {
  const filas = [...informes].reverse().map((informe) => ({
    informe,
    registro: informe.comunidades.find((c) => c.comunidad_autonoma === comunidad),
  }));

  return (
    <div className={styles.tablaContenedor}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th scope="col">Trimestre</th>
            <th scope="col">Tasa</th>
            <th scope="col">Interanual</th>
            <th scope="col">Tendencia</th>
            <th scope="col">Gravedad</th>
            <th scope="col">Confianza</th>
            <th scope="col">Noticiable</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ informe, registro }) => (
            <tr key={etiquetaTrimestre(informe)}>
              <td className={styles.comunidad}>{etiquetaTrimestre(informe)}</td>
              <td>{formatearTasa(registro?.tasa_litigiosidad)}</td>
              <td>{formatearPorcentaje(registro?.variacion_interanual_pct)}</td>
              <td>
                {registro?.clasificacion ? (
                  <span
                    className={`${styles.insignia} ${styles[CLASE_TENDENCIA[registro.clasificacion.tendencia]]}`}
                  >
                    {registro.clasificacion.tendencia}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td>
                {registro?.clasificacion
                  ? etiquetaGravedad(registro.clasificacion.gravedad_congestion)
                  : "—"}
              </td>
              <td
                className={
                  (confianzaMinima(registro?.clasificacion) ?? 1) < 0.5
                    ? styles.confianzaBaja
                    : undefined
                }
              >
                {formatearConfianza(confianzaMinima(registro?.clasificacion))}
              </td>
              <td>
                {registro?.clasificacion
                  ? registro.clasificacion.es_noticiable
                    ? `sí (${Math.round(registro.clasificacion.probabilidad_noticiable * 100)} %)`
                    : "no"
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
