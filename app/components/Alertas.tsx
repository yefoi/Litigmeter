import Link from "next/link";
import styles from "../page.module.css";
import type { FicheroAlertas, SeveridadAlerta } from "@/lib/alertas";
import { slugDeComunidad } from "@/lib/litigiosidad/presentacion";

const CLASE_SEVERIDAD: Record<SeveridadAlerta, string> = {
  alta: "tendenciaEmpeora",
  media: "tendenciaEstable",
  baja: "tendenciaEstable",
};

export default function Alertas({ fichero }: { fichero: FicheroAlertas }) {
  if (fichero.alertas.length === 0) {
    return <p className={styles.nota}>Sin alertas para este trimestre.</p>;
  }

  return (
    <ul className={styles.listaAlertas}>
      {fichero.alertas.map((alerta, indice) => (
        <li key={`${alerta.comunidad_autonoma}-${alerta.tipo}-${indice}`}>
          <span className={`${styles.insignia} ${styles[CLASE_SEVERIDAD[alerta.severidad]]}`}>
            {alerta.severidad}
          </span>
          <Link href={`/ccaa/${slugDeComunidad(alerta.comunidad_autonoma)}`}>
            {alerta.comunidad_autonoma}
          </Link>
          <span className={styles.alertaDetalle}>{alerta.detalle}</span>
        </li>
      ))}
    </ul>
  );
}
