import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import SerieAnualChart from "../../components/SerieAnualChart";
import TablaTrimestres from "../../components/TablaTrimestres";
import TendenciaChart from "../../components/TendenciaChart";
import styles from "../../page.module.css";
import { leerIndicadores } from "@/lib/indicadores/ficheros";
import { COMUNIDADES } from "@/lib/litigiosidad/ccaa";
import { leerInformes } from "@/lib/litigiosidad/historico";
import {
  CLAVE_NACIONAL,
  comunidadDeSlug,
  etiquetaTrimestre,
  formatearPorcentaje,
  formatearTasa,
  serieNacional,
  seriePorComunidad,
  slugDeComunidad,
  type PuntoSerie,
} from "@/lib/litigiosidad/presentacion";
import { leerSerieAnual } from "@/lib/litigiosidad/series";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMUNIDADES.map((comunidad) => ({ slug: slugDeComunidad(comunidad.nombre) }));
}

function formatearNumero(valor: number | undefined): string {
  return valor === undefined ? "—" : valor.toFixed(2).replace(".", ",");
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comunidad = comunidadDeSlug(slug);
  if (!comunidad) notFound();

  const dataDir = path.join(process.cwd(), "data", "litigiosidad");
  const baseDir = path.dirname(dataDir);
  const informes = await leerInformes(dataDir);

  if (informes.length === 0) {
    return (
      <main className={styles.main}>
        <h1>{comunidad}</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run ingest</code> para descargar la última
          nota trimestral del CGPJ.
        </p>
      </main>
    );
  }

  const ultimo = informes[informes.length - 1];
  const registro = ultimo.comunidades.find((c) => c.comunidad_autonoma === comunidad);
  const serie = await leerSerieAnual(baseDir);
  const filaAnual = serie?.comunidades.find((c) => c.comunidad_autonoma === comunidad);
  const filasAnuales = serie
    ? serie.anios.map((anio, indice) => ({
        anio,
        comunidad: filaAnual?.valores[indice] ?? null,
        nacional: serie.nacional[indice] ?? null,
      }))
    : [];
  const indicadores = await leerIndicadores(baseDir, ultimo.anio, ultimo.trimestre);
  const tasas = indicadores?.comunidades[comunidad];

  const series: Record<string, PuntoSerie[]> = {
    [comunidad]: seriePorComunidad(informes, comunidad),
    [CLAVE_NACIONAL]: serieNacional(informes),
  };

  return (
    <main className={styles.main}>
      <p className={styles.migas}>
        <Link href="/">← Volver al panel</Link>
      </p>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.kicker}>Litigmeter · Comunidad</p>
          <h1>{comunidad}</h1>
          <p className={styles.subtitulo}>
            Último informe: {etiquetaTrimestre(ultimo)} (publicado el{" "}
            {ultimo.fuente.fecha_publicacion ?? "—"})
          </p>
        </div>
        <div className={styles.fuente}>
          <a href={ultimo.fuente.url} target="_blank" rel="noopener noreferrer">
            Nota de prensa
          </a>
          <Link href="/feed.xml">RSS</Link>
        </div>
      </header>

      <section className={styles.resumenNacional}>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Tasa de litigiosidad</span>
          <strong className={styles.datoValor}>{formatearTasa(registro?.tasa_litigiosidad)}</strong>
          <span className={styles.datoDetalle}>
            {registro
              ? `pos. ${registro.posicion_nacional} de ${ultimo.comunidades.length} · ${formatearPorcentaje(registro.variacion_interanual_pct)} interanual`
              : "sin dato en el último informe"}
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Congestión</span>
          <strong className={styles.datoValor}>{formatearNumero(tasas?.congestion)}</strong>
          <span className={styles.datoDetalle}>
            {tasas?.congestion_anio_anterior !== undefined
              ? `año anterior: ${formatearNumero(tasas.congestion_anio_anterior)}`
              : "indicadores no disponibles"}
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Pendencia</span>
          <strong className={styles.datoValor}>{formatearNumero(tasas?.pendencia)}</strong>
          <span className={styles.datoDetalle}>
            {tasas?.pendencia_anio_anterior !== undefined
              ? `año anterior: ${formatearNumero(tasas.pendencia_anio_anterior)}`
              : "indicadores no disponibles"}
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Resolución</span>
          <strong className={styles.datoValor}>{formatearNumero(tasas?.resolucion)}</strong>
          <span className={styles.datoDetalle}>
            {tasas?.resolucion_anio_anterior !== undefined
              ? `año anterior: ${formatearNumero(tasas.resolucion_anio_anterior)}`
              : "indicadores no disponibles"}
          </span>
        </article>
      </section>

      <section className={styles.bloque}>
        <h2>Evolución trimestral</h2>
        <TendenciaChart
          series={series}
          opciones={[comunidad, CLAVE_NACIONAL]}
          opcionInicial={comunidad}
        />
      </section>

      {filasAnuales.length > 0 ? (
        <section className={styles.bloque}>
          <h2>
            Serie anual (2001–{serie?.anios.at(-1)})
          </h2>
          <SerieAnualChart datos={filasAnuales} comunidad={comunidad} />
        </section>
      ) : null}

      <section className={styles.bloque}>
        <h2>Histórico trimestral</h2>
        <TablaTrimestres informes={informes} comunidad={comunidad} />
      </section>

      <footer className={styles.pie}>
        <p>
          Fuentes: notas de prensa trimestrales y series de litigiosidad por TSJ del CGPJ.{" "}
          <Link href="/">Volver al panel</Link>.
        </p>
      </footer>
    </main>
  );
}
