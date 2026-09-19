import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import Logo from "../components/Logo";
import TendenciaChart from "../components/TendenciaChart";
import styles from "../page.module.css";
import { leerInformesDivorcios } from "@/lib/divorcios/ficheros";
import type { DatoDivorcio } from "@/lib/divorcios/tipos";
import { etiquetaTrimestre, formatearPorcentaje } from "@/lib/litigiosidad/presentacion";

export const metadata: Metadata = {
  title: "Divorcios, separaciones y nulidades · Litigmeter",
  description:
    "Demandas de disolución matrimonial (divorcios, separaciones y nulidades) presentadas en los órganos judiciales, con la tasa por cada 100.000 habitantes de cada comunidad autónoma (CGPJ).",
};

function numero(valor: number | undefined): string {
  if (valor === undefined) return "—";
  return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function puntos(valor: number | undefined): string {
  if (valor === undefined) return "—";
  return `${valor > 0 ? "+" : ""}${valor.toFixed(1).replace(".", ",")}`;
}

function total(dato: DatoDivorcio | undefined): string {
  return numero(dato?.total);
}

function variacion(dato: DatoDivorcio | undefined): string {
  return formatearPorcentaje(dato?.variacion_interanual_pct);
}

export default async function Page() {
  const informes = await leerInformesDivorcios(path.join(process.cwd(), "data"));

  if (informes.length === 0) {
    return (
      <main className={styles.main}>
        <h1>Divorcios, separaciones y nulidades</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run divorcios</code>.
        </p>
      </main>
    );
  }

  const ultimo = informes.at(-1)!;
  const nacional = ultimo.nacional;
  const medidas: Array<[string, DatoDivorcio | undefined]> = [
    ["Modificación de medidas consensuadas", nacional.modificacion_medidas_consensuadas],
    ["Modificación de medidas no consensuadas", nacional.modificacion_medidas_no_consensuadas],
    ["Guarda y custodia consensuadas", nacional.guarda_custodia_consensuadas],
    ["Guarda y custodia no consensuadas", nacional.guarda_custodia_no_consensuadas],
  ];
  const serie = {
    "Disoluciones matrimoniales": informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.total,
    })),
    "Divorcios no consensuados": informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.divorcios_no_consensuados?.total ?? 0,
    })),
    "Divorcios consensuados": informes.map((informe) => ({
      etiqueta: etiquetaTrimestre(informe),
      tasa: informe.nacional.divorcios_consensuados?.total ?? 0,
    })),
  };

  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Divorcios</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Divorcios, separaciones y nulidades</h1>
          <p className={styles.subtitulo}>
            Último informe: {etiquetaTrimestre(ultimo)} · Demandas de disolución matrimonial
            (CGPJ)
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
          <span className={styles.datoTitulo}>Demandas de disolución</span>
          <strong className={styles.datoValor}>{numero(nacional.total)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(nacional.variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Divorcios consensuados</span>
          <strong className={styles.datoValor}>{total(nacional.divorcios_consensuados)}</strong>
          <span className={styles.datoDetalle}>
            {variacion(nacional.divorcios_consensuados)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Divorcios no consensuados</span>
          <strong className={styles.datoValor}>
            {total(nacional.divorcios_no_consensuados)}
          </strong>
          <span className={styles.datoDetalle}>
            {variacion(nacional.divorcios_no_consensuados)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Separaciones</span>
          <strong className={styles.datoValor}>
            {numero(
              (nacional.separaciones_consensuadas?.total ?? 0) +
                (nacional.separaciones_no_consensuadas?.total ?? 0),
            )}
          </strong>
          <span className={styles.datoDetalle}>
            {total(nacional.separaciones_consensuadas)} consensuadas (
            {variacion(nacional.separaciones_consensuadas)}) ·{" "}
            {total(nacional.separaciones_no_consensuadas)} no consensuadas (
            {variacion(nacional.separaciones_no_consensuadas)})
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Nulidades</span>
          <strong className={styles.datoValor}>{total(nacional.nulidades)}</strong>
          <span className={styles.datoDetalle}>
            {variacion(nacional.nulidades)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Tasa nacional</span>
          <strong className={styles.datoValor}>
            {nacional.tasa_media_por_100000?.toFixed(1).replace(".", ",")}
          </strong>
          <span className={styles.datoDetalle}>demandas por cada 100.000 habitantes</span>
        </article>
      </section>

      {informes.length > 1 ? (
        <section className={styles.bloque}>
          <h2>Evolución trimestral</h2>
          <TendenciaChart
            series={serie}
            opciones={Object.keys(serie)}
            opcionInicial="Disoluciones matrimoniales"
            unidad="demandas"
          />
        </section>
      ) : null}

      <section className={styles.bloque}>
        <h2>Demandas por comunidad · {etiquetaTrimestre(ultimo)}</h2>
        <p className={styles.nota}>
          Demandas por cada 100.000 habitantes. La media nacional fue{" "}
          {nacional.tasa_media_por_100000?.toFixed(1).replace(".", ",")}.
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
                  <td>{comunidad.tasa_por_100000.toFixed(1).replace(".", ",")}</td>
                  <td>
                    {nacional.tasa_media_por_100000 !== undefined
                      ? puntos(comunidad.tasa_por_100000 - nacional.tasa_media_por_100000)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Modificación de medidas y guarda · {etiquetaTrimestre(ultimo)}</h2>
        <div className={styles.tablaContenedor}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">Procedimiento</th>
                <th scope="col">Demandas</th>
                <th scope="col">Interanual</th>
              </tr>
            </thead>
            <tbody>
              {medidas.map(([titulo, registro]) => (
                <tr key={titulo}>
                  <td className={styles.comunidad}>{titulo}</td>
                  <td>{numero(registro?.total)}</td>
                  <td>{formatearPorcentaje(registro?.variacion_interanual_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.pie}>
        <p>
          Datos del informe de demandas de disolución matrimonial (CGPJ), que mide demandas
          presentadas y no sentencias. <Link href="/">Volver al panel</Link> ·{" "}
          <Link href="/metodologia">Metodología</Link>.
        </p>
      </footer>
    </main>
  );
}
