import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import Logo from "../components/Logo";
import TendenciaChart from "../components/TendenciaChart";
import styles from "../page.module.css";
import { leerInformesCrisis } from "@/lib/crisis/ficheros";
import type { IndicadorCrisis } from "@/lib/crisis/tipos";
import { etiquetaTrimestre, formatearPorcentaje } from "@/lib/litigiosidad/presentacion";

export const metadata: Metadata = {
  title: "Desahucios, ejecuciones hipotecarias y concursos · Litigmeter",
  description:
    "Lanzamientos (desahucios), ejecuciones hipotecarias, concursos, despidos y monitorios en los órganos judiciales, con los datos del informe Efectos de la crisis económica del CGPJ.",
};

function numero(valor: number | undefined): string {
  if (valor === undefined) return "—";
  return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const RANKINGS: Array<{ indicador: IndicadorCrisis; titulo: string }> = [
  { indicador: "lanzamientos", titulo: "Lanzamientos practicados" },
  { indicador: "lanzamientos_lau", titulo: "Lanzamientos por impago del alquiler (LAU)" },
  { indicador: "lanzamientos_hipotecarios", titulo: "Lanzamientos por ejecución hipotecaria" },
  { indicador: "ejecuciones_hipotecarias", titulo: "Ejecuciones hipotecarias presentadas" },
  { indicador: "concursos", titulo: "Concursos presentados" },
  { indicador: "concursos_personas_juridicas", titulo: "Concursos de personas jurídicas" },
  {
    indicador: "concursos_naturales_empresarios",
    titulo: "Concursos de personas naturales empresarias",
  },
  {
    indicador: "concursos_naturales_no_empresarios",
    titulo: "Concursos de personas naturales no empresarias",
  },
  { indicador: "despidos", titulo: "Demandas por despido" },
  { indicador: "reclamaciones_cantidad", titulo: "Reclamaciones de cantidad" },
  { indicador: "monitorios", titulo: "Procedimientos monitorios" },
  { indicador: "ocupacion_ilegal", titulo: "Verbales por ocupación ilegal de vivienda" },
];

export default async function Page() {
  const informes = await leerInformesCrisis(path.join(process.cwd(), "data"));

  if (informes.length === 0) {
    return (
      <main className={styles.main}>
        <h1>Desahucios, ejecuciones hipotecarias y concursos</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run crisis</code>.
        </p>
      </main>
    );
  }

  const ultimo = informes.at(-1)!;
  const nacional = ultimo.nacional;
  const serie = {
    Lanzamientos: informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.lanzamientos.total,
    })),
    "Ejecuciones hipotecarias": informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.ejecuciones_hipotecarias.total,
    })),
    Concursos: informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.concursos.total,
    })),
  };

  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Crisis y vivienda</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Desahucios, ejecuciones hipotecarias y concursos</h1>
          <p className={styles.subtitulo}>
            Último informe: {etiquetaTrimestre(ultimo)} · Efectos de la crisis económica en los
            órganos judiciales (CGPJ)
          </p>
        </div>
        <div className={styles.fuente}>
          <a href={ultimo.fuente.url} target="_blank" rel="noopener noreferrer">
            Nota de prensa
          </a>
          {ultimo.fuente.pdf_url ? (
            <a href={ultimo.fuente.pdf_url} target="_blank" rel="noopener noreferrer">
              PDF
            </a>
          ) : null}
        </div>
      </header>

      <section className={styles.resumenNacional}>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Lanzamientos practicados</span>
          <strong className={styles.datoValor}>{numero(nacional.lanzamientos.total)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.lanzamientos.variacion_interanual_pct)} interanual ·{" "}
            {numero(nacional.lanzamientos.lau)} por impago del alquiler (
            {nacional.lanzamientos.lau_pct_del_total?.toFixed(1).replace(".", ",")} %)
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Lanzamientos solicitados</span>
          <strong className={styles.datoValor}>
            {numero(nacional.lanzamientos.solicitados)}
          </strong>
          <span className={styles.datoDetalle}>
            servicios comunes ·{" "}
            {formatearPorcentaje(nacional.lanzamientos.solicitados_variacion_interanual_pct)}{" "}
            interanual · {numero(nacional.lanzamientos.solicitados_cumplimiento_positivo)} con
            cumplimiento positivo
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Ejecuciones hipotecarias</span>
          <strong className={styles.datoValor}>
            {numero(nacional.ejecuciones_hipotecarias.total)}
          </strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.ejecuciones_hipotecarias.variacion_interanual_pct)}{" "}
            interanual ·{" "}
            {nacional.lanzamientos.hipotecarios_pct_del_total?.toFixed(1).replace(".", ",")} % de
            los lanzamientos
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Concursos presentados</span>
          <strong className={styles.datoValor}>{numero(nacional.concursos.total)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.concursos.variacion_interanual_pct)} interanual ·{" "}
            {numero(nacional.concursos.naturales_no_empresarios)} de personas físicas no
            empresarias (
            {formatearPorcentaje(nacional.concursos.naturales_no_empresarios_variacion_interanual_pct)})
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Demandas por despido</span>
          <strong className={styles.datoValor}>{numero(nacional.despidos.total)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.despidos.variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Procedimientos monitorios</span>
          <strong className={styles.datoValor}>{numero(nacional.monitorios.total)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.monitorios.variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Reclamaciones de cantidad</span>
          <strong className={styles.datoValor}>
            {numero(nacional.reclamaciones_cantidad.total)}
          </strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.reclamaciones_cantidad.variacion_interanual_pct)}{" "}
            interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Ocupación ilegal de vivienda</span>
          <strong className={styles.datoValor}>{numero(nacional.ocupacion_ilegal.total)}</strong>
          <span className={styles.datoDetalle}>
            verbales posesorios ·{" "}
            {formatearPorcentaje(nacional.ocupacion_ilegal.variacion_interanual_pct)} interanual
          </span>
        </article>
      </section>

      {informes.length > 1 ? (
        <section className={styles.bloque}>
          <h2>Evolución trimestral</h2>
          <TendenciaChart
            series={serie}
            opciones={Object.keys(serie)}
            opcionInicial="Lanzamientos"
            unidad="asuntos"
          />
        </section>
      ) : null}

      <section className={styles.bloque}>
        <h2>Comunidades con más casos · {etiquetaTrimestre(ultimo)}</h2>
        <p className={styles.nota}>
          El CGPJ solo publica en la nota los cuatro primeros territorios de cada indicador.
        </p>
        {RANKINGS.map(({ indicador, titulo }) => {
          const filas = ultimo.rankings.filter((entrada) => entrada.indicador === indicador);
          if (filas.length === 0) return null;
          return (
            <div key={indicador} className={styles.bloque}>
              <h3>{titulo}</h3>
              <div className={styles.tablaContenedor}>
                <table className={styles.tabla}>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Comunidad</th>
                      <th scope="col">Asuntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, indice) => (
                      <tr key={fila.comunidad_autonoma}>
                        <td className={styles.posicion}>{indice + 1}</td>
                        <td className={styles.comunidad}>{fila.comunidad_autonoma}</td>
                        <td>{numero(fila.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      <footer className={styles.pie}>
        <p>
          Datos del informe Efectos de la crisis económica en los órganos judiciales (CGPJ).{" "}
          <Link href="/">Volver al panel</Link> · <Link href="/metodologia">Metodología</Link>.
        </p>
      </footer>
    </main>
  );
}
