import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import Logo from "../components/Logo";
import TendenciaChart from "../components/TendenciaChart";
import styles from "../page.module.css";
import { formatearPorcentaje } from "@/lib/litigiosidad/presentacion";
import { leerSeriesOrdenes } from "@/lib/ordenes/series";
import type { OrdenJurisdiccional, SerieOrden } from "@/lib/ordenes/tipos";

export const metadata: Metadata = {
  title: "Asuntos por orden jurisdiccional · Litigmeter",
  description:
    "Asuntos ingresados, resueltos y en trámite en los órganos judiciales por orden jurisdiccional (civil, penal, contencioso-administrativo y social) y comunidad autónoma, con series desde 2001 (CGPJ).",
};

const ORDENES_UI: Array<{ clave: OrdenJurisdiccional; titulo: string }> = [
  { clave: "civil", titulo: "Civil" },
  { clave: "penal", titulo: "Penal" },
  { clave: "contencioso", titulo: "Contencioso-Administrativo" },
  { clave: "social", titulo: "Social" },
];

function numero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function variacion(actual: number | null, anterior: number | null): number | undefined {
  if (actual === null || anterior === null || anterior === 0) return undefined;
  return ((actual - anterior) / anterior) * 100;
}

function serieNacional(orden: SerieOrden, anios: number[]) {
  return anios
    .map((anio, indice) => ({ etiqueta: String(anio), tasa: orden.nacional.ingresados[indice] }))
    .filter((punto): punto is { etiqueta: string; tasa: number } => punto.tasa !== null);
}

export default async function Page() {
  const serie = await leerSeriesOrdenes(path.join(process.cwd(), "data"));

  if (!serie) {
    return (
      <main className={styles.main}>
        <h1>Asuntos por orden jurisdiccional</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run ordenes</code>.
        </p>
      </main>
    );
  }

  const indice = serie.anios.length - 1;
  const anio = serie.anios[indice];
  const anioAnterior = serie.anios[indice - 1];
  const porOrden = Object.fromEntries(
    serie.ordenes.map((orden) => [orden.orden, orden]),
  ) as Record<OrdenJurisdiccional, SerieOrden>;
  const grafico = Object.fromEntries(
    ORDENES_UI.map(({ clave, titulo }) => [titulo, serieNacional(porOrden[clave], serie.anios)]),
  );

  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Órdenes jurisdiccionales</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Asuntos por orden jurisdiccional</h1>
          <p className={styles.subtitulo}>
            Ingresados, resueltos y en trámite · serie {serie.anios[0]}-{anio} (CGPJ)
          </p>
        </div>
        <div className={styles.fuente}>
          <a href={serie.fuente.url} target="_blank" rel="noopener noreferrer">
            Series del CGPJ
          </a>
        </div>
      </header>

      <section className={styles.resumenNacional}>
        {ORDENES_UI.map(({ clave, titulo }) => {
          const orden = porOrden[clave];
          const ingresados = orden.nacional.ingresados[indice];
          return (
            <article key={clave} className={styles.dato}>
              <span className={styles.datoTitulo}>{titulo}</span>
              <strong className={styles.datoValor}>{numero(ingresados)}</strong>
              <span className={styles.datoDetalle}>
                {formatearPorcentaje(
                  variacion(orden.nacional.ingresados[indice], orden.nacional.ingresados[indice - 1]),
                )}{" "}
                interanual · {numero(orden.nacional.resueltos[indice])} resueltos ·{" "}
                {numero(orden.nacional.en_tramite[indice])} en trámite
              </span>
            </article>
          );
        })}
      </section>

      <section className={styles.bloque}>
        <h2>Evolución de asuntos ingresados ({serie.anios[0]}-{anio})</h2>
        <TendenciaChart
          series={grafico}
          opciones={ORDENES_UI.map(({ titulo }) => titulo)}
          opcionInicial="Civil"
          unidad="asuntos"
        />
      </section>

      {ORDENES_UI.map(({ clave, titulo }) => {
        const orden = porOrden[clave];
        const total = orden.nacional.ingresados[indice];
        const filas = [...orden.comunidades].sort(
          (a, b) => (b.ingresados[indice] ?? -1) - (a.ingresados[indice] ?? -1),
        );
        return (
          <section key={clave} className={styles.bloque}>
            <h2>
              {titulo} · {anio}
            </h2>
            <div className={styles.tablaContenedor}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Comunidad</th>
                    <th scope="col">Ingresados</th>
                    <th scope="col">% nacional</th>
                    <th scope="col">Resueltos</th>
                    <th scope="col">En trámite</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((comunidad, posicion) => (
                    <tr key={comunidad.comunidad_autonoma}>
                      <td className={styles.posicion}>{posicion + 1}</td>
                      <td className={styles.comunidad}>{comunidad.comunidad_autonoma}</td>
                      <td>{numero(comunidad.ingresados[indice])}</td>
                      <td>
                        {total && comunidad.ingresados[indice] !== null
                          ? `${((comunidad.ingresados[indice]! / total) * 100).toFixed(1).replace(".", ",")} %`
                          : "—"}
                      </td>
                      <td>{numero(comunidad.resueltos[indice])}</td>
                      <td>{numero(comunidad.en_tramite[indice])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <footer className={styles.pie}>
        <p>
          Datos de las series de actividad de los órganos judiciales (CGPJ). Compara{" "}
          {anio} con {anioAnterior} para obtener la variación interanual.{" "}
          <Link href="/">Volver al panel</Link> · <Link href="/metodologia">Metodología</Link>.
        </p>
      </footer>
    </main>
  );
}
