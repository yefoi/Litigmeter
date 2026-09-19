import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import Logo from "../components/Logo";
import TendenciaChart from "../components/TendenciaChart";
import styles from "../page.module.css";
import { etiquetaTrimestre, formatearPorcentaje } from "@/lib/litigiosidad/presentacion";
import { leerInformesViolencia } from "@/lib/violencia/ficheros";

export const metadata: Metadata = {
  title: "Violencia de género · Litigmeter",
  description:
    "Denuncias, víctimas y órdenes de protección por violencia de género en los órganos judiciales, con la tasa por cada 10.000 mujeres de cada comunidad autónoma (CGPJ).",
};

function numero(valor: number | undefined): string {
  if (valor === undefined) return "—";
  return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function puntos(valor: number | undefined): string {
  if (valor === undefined) return "—";
  return `${valor > 0 ? "+" : ""}${valor.toFixed(1).replace(".", ",")}`;
}

export default async function Page() {
  const informes = await leerInformesViolencia(path.join(process.cwd(), "data"));

  if (informes.length === 0) {
    return (
      <main className={styles.main}>
        <h1>Violencia de género</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run violencia</code>.
        </p>
      </main>
    );
  }

  const ultimo = informes.at(-1)!;
  const nacional = ultimo.nacional;
  const serie = {
    "Tasa por 10.000 mujeres": informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.tasa_victimas_por_10000,
    })),
  };

  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Violencia de género</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Violencia de género en la justicia</h1>
          <p className={styles.subtitulo}>
            Último informe: {etiquetaTrimestre(ultimo)} · Observatorio contra la Violencia
            Doméstica y de Género (CGPJ)
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
          <span className={styles.datoTitulo}>Denuncias recibidas</span>
          <strong className={styles.datoValor}>{numero(nacional.denuncias)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.denuncias_variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Mujeres que denunciaron</span>
          <strong className={styles.datoValor}>{numero(nacional.mujeres_denunciantes)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.mujeres_variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Tasa por 10.000 mujeres</span>
          <strong className={styles.datoValor}>
            {nacional.tasa_victimas_por_10000.toFixed(1).replace(".", ",")}
          </strong>
          <span className={styles.datoDetalle}>
            {puntos(nacional.tasa_delta_puntos)} puntos vs hace un año
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Renuncias a declarar</span>
          <strong className={styles.datoValor}>
            {nacional.renuncias_pct !== undefined
              ? `${nacional.renuncias_pct.toFixed(1).replace(".", ",")} %`
              : "—"}
          </strong>
          <span className={styles.datoDetalle}>
            {numero(nacional.renuncias)} mujeres ·{" "}
            {formatearPorcentaje(nacional.renuncias_variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Sentencias condenatorias</span>
          <strong className={styles.datoValor}>
            {nacional.sentencias_condenatorias_pct !== undefined
              ? `${nacional.sentencias_condenatorias_pct.toFixed(1).replace(".", ",")} %`
              : "—"}
          </strong>
          <span className={styles.datoDetalle}>
            {numero(nacional.sentencias)} sentencias · {numero(nacional.ordenes_solicitadas)}{" "}
            órdenes solicitadas ({numero(nacional.ordenes_acordadas)} acordadas)
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Violencia sexual (fuera de pareja)</span>
          <strong className={styles.datoValor}>
            {numero(nacional.violencia_sexual_denuncias)}
          </strong>
          <span className={styles.datoDetalle}>
            denuncias · {numero(nacional.violencia_sexual_ordenes_acordadas)} órdenes acordadas
            de {numero(nacional.violencia_sexual_ordenes_solicitadas)} pedidas
          </span>
        </article>
      </section>

      <section className={styles.bloque}>
        <h2>Evolución de la tasa</h2>
        <TendenciaChart
          series={serie}
          opciones={Object.keys(serie)}
          opcionInicial="Tasa por 10.000 mujeres"
          unidad="por 10.000 mujeres"
        />
      </section>

      <section className={styles.bloque}>
        <h2>Tasa por comunidad · {etiquetaTrimestre(ultimo)}</h2>
        <p className={styles.nota}>
          Víctimas denunciantes por cada 10.000 mujeres. La media nacional fue{" "}
          {nacional.tasa_victimas_por_10000.toFixed(1).replace(".", ",")}.
        </p>
        <div className={styles.tablaContenedor}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Comunidad</th>
                <th scope="col">Tasa</th>
                <th scope="col">vs media</th>
              </tr>
            </thead>
            <tbody>
              {ultimo.comunidades.map((comunidad, indice) => (
                <tr key={comunidad.comunidad_autonoma}>
                  <td className={styles.posicion}>{indice + 1}</td>
                  <td className={styles.comunidad}>{comunidad.comunidad_autonoma}</td>
                  <td>{comunidad.tasa_victimas_por_10000.toFixed(1).replace(".", ",")}</td>
                  <td>{puntos(comunidad.tasa_victimas_por_10000 - nacional.tasa_victimas_por_10000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.pie}>
        <p>
          Datos del Observatorio contra la Violencia Doméstica y de Género (CGPJ). No es una
          fuente oficial de asesoramiento; si necesitas ayuda, llama al 016.{" "}
          <Link href="/">Volver al panel</Link> ·{" "}
          <Link href="/metodologia">Metodología</Link>.
        </p>
      </footer>
    </main>
  );
}
