import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import Logo from "../components/Logo";
import ProvinciasPanel from "../components/ProvinciasPanel";
import styles from "../page.module.css";
import { leerSeriesProvincias } from "@/lib/litigiosidad/series-provincias";
import { formatearTasa } from "@/lib/litigiosidad/presentacion";

export const metadata: Metadata = {
  title: "Litigiosidad por provincia · Litigmeter",
  description:
    "Tasa de litigiosidad anual de las 52 provincias españolas desde 2001, según las series estadísticas del CGPJ.",
};

function formatearVariacion(actual: number | null, anterior: number | null): string {
  if (actual === null || anterior === null || anterior === 0) return "—";
  const variacion = ((actual - anterior) / anterior) * 100;
  const signo = variacion > 0 ? "+" : "";
  return `${signo}${variacion.toFixed(1).replace(".", ",")} %`;
}

export default async function Page() {
  const serie = await leerSeriesProvincias(path.join(process.cwd(), "data"));

  if (!serie) {
    return (
      <main className={styles.main}>
        <h1>Litigiosidad por provincia</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run backfill-provincias</code>.
        </p>
      </main>
    );
  }

  const ultimoIndice = serie.anios.length - 1;
  const anioActual = serie.anios[ultimoIndice];
  const anioAnterior = serie.anios[ultimoIndice - 1];

  const filas = serie.provincias
    .map((provincia) => ({
      ...provincia,
      actual: provincia.valores[ultimoIndice] ?? null,
      anterior: ultimoIndice > 0 ? provincia.valores[ultimoIndice - 1] ?? null : null,
    }))
    .filter((fila) => fila.actual !== null)
    .sort((a, b) => (b.actual ?? 0) - (a.actual ?? 0));

  const series: Record<string, { anio: number; comunidad: number | null; nacional: number | null }[]> = {};
  for (const provincia of serie.provincias) {
    series[provincia.provincia] = serie.anios.map((anio, indice) => ({
      anio,
      comunidad: provincia.valores[indice] ?? null,
      nacional: serie.nacional[indice] ?? null,
    }));
  }

  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Provincias</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Litigiosidad por provincia</h1>
          <p className={styles.subtitulo}>
            Tasa anual por provincia desde {serie.anios[0]} según las series del CGPJ. La
            comunidad autónoma agrupa a sus provincias.
          </p>
        </div>
      </header>

      <section className={styles.bloque}>
        <h2>Evolución anual</h2>
        <ProvinciasPanel
          series={series}
          provinciaInicial={filas[0]?.provincia ?? serie.provincias[0].provincia}
        />
      </section>

      <section className={styles.bloque}>
        <h2>
          Provincias · {anioActual}
        </h2>
        <div className={styles.tablaContenedor}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Provincia</th>
                <th scope="col">Comunidad</th>
                <th scope="col">Tasa</th>
                <th scope="col">vs {anioAnterior}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, indice) => (
                <tr key={fila.provincia}>
                  <td className={styles.posicion}>{indice + 1}</td>
                  <td className={styles.comunidad}>{fila.provincia}</td>
                  <td>{fila.comunidad_autonoma ?? "ciudad autónoma"}</td>
                  <td>{formatearTasa(fila.actual)}</td>
                  <td>{formatearVariacion(fila.actual, fila.anterior)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.pie}>
        <p>
          Datos: series estadísticas del CGPJ. <Link href="/">Volver al panel</Link> ·{" "}
          <Link href="/metodologia">Metodología</Link>.
        </p>
      </footer>
    </main>
  );
}
