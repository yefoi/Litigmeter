import path from "node:path";
import Link from "next/link";
import Editorial from "./components/Editorial";
import Faq from "./components/Faq";
import Heatmap from "./components/Heatmap";
import Logo from "./components/Logo";
import MapaCcaa from "./components/MapaCcaa";
import TablaUltimoTrimestre from "./components/TablaUltimoTrimestre";
import TendenciaChart from "./components/TendenciaChart";
import styles from "./page.module.css";
import { leerEditorial } from "@/lib/editorial/ficheros";
import { leerIndicadores } from "@/lib/indicadores/ficheros";
import { leerInformes } from "@/lib/litigiosidad/historico";
import { indicesDeInforme } from "@/lib/litigiosidad/indice";
import {
  CLAVE_NACIONAL,
  etiquetaTrimestre,
  formatearPorcentaje,
  formatearTasa,
  nombresDeComunidades,
  serieNacional,
  seriePorComunidad,
  slugDeComunidad,
  type PuntoSerie,
} from "@/lib/litigiosidad/presentacion";

function formatearFecha(fecha: string | undefined): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export default async function Home() {
  const dataBase = path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));

  if (informes.length === 0) {
    return (
      <main className={styles.main}>
        <h1>Litigiosidad judicial por CCAA</h1>
        <p>
          Todavía no hay datos. Ejecuta <code>npm run ingest</code> para descargar la última
          nota trimestral del CGPJ.
        </p>
      </main>
    );
  }

  const ultimo = informes[informes.length - 1];
  const nombres = nombresDeComunidades(informes);
  const series: Record<string, PuntoSerie[]> = {
    [CLAVE_NACIONAL]: serieNacional(informes),
  };
  for (const nombre of nombres) {
    series[nombre] = seriePorComunidad(informes, nombre);
  }
  const opciones = [CLAVE_NACIONAL, ...nombres];
  const porEncimaDeLaMedia = ultimo.comunidades.filter(
    (comunidad) => comunidad.tasa_litigiosidad > ultimo.nacional.tasa_litigiosidad,
  ).length;
  const hayClasificacion = ultimo.comunidades.some((comunidad) => comunidad.clasificacion);
  const noticiables = ultimo.comunidades.filter(
    (comunidad) => comunidad.clasificacion?.es_noticiable,
  );
  const editorial = await leerEditorial(dataBase, ultimo.anio, ultimo.trimestre);
  const indicadores = await leerIndicadores(dataBase, ultimo.anio, ultimo.trimestre);
  const indices = indicesDeInforme(ultimo, indicadores);
  const indicesPlanos: Record<string, number> = {};
  for (const [nombre, resultado] of indices) {
    indicesPlanos[nombre] = resultado.valor;
  }
  const datosMapa: Record<string, { tasa: number; indice?: number }> = {};
  for (const comunidad of ultimo.comunidades) {
    datosMapa[comunidad.comunidad_autonoma] = {
      tasa: comunidad.tasa_litigiosidad,
      indice: indicesPlanos[comunidad.comunidad_autonoma],
    };
  }

  return (
    <main className={styles.main}>
      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <p className={styles.kicker}>Estadística Judicial del CGPJ</p>
          <h1>Litigiosidad judicial por comunidad autónoma</h1>
          <p className={styles.subtitulo}>
            {nombres.length} comunidades · {informes.length} trimestres · último informe{" "}
            {etiquetaTrimestre(ultimo)} (publicado el{" "}
            {formatearFecha(ultimo.fuente.fecha_publicacion)})
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

      <nav className="subnav" aria-label="Secciones de la página">
        <a href="#resumen">Resumen</a>
        <a href="#evolucion">Evolución</a>
        <a href="#mapa">Mapa</a>
        <a href="#mapa-espana">España</a>
        <a href="#tabla">Tabla</a>
        {editorial ? <a href="#editorial">Editorial</a> : null}
        <a href="#faq">FAQ</a>
        <a href="/feed.xml">RSS</a>
      </nav>

      <nav className={styles.saltoCcaa} aria-label="Ir a una comunidad autónoma">
        {nombres.map((nombre) => (
          <Link key={nombre} href={`/ccaa/${slugDeComunidad(nombre)}`}>
            {nombre}
          </Link>
        ))}
      </nav>

      <section id="resumen" className={styles.resumenNacional}>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Tasa de litigiosidad nacional</span>
          <strong className={styles.datoValor}>{formatearTasa(ultimo.nacional.tasa_litigiosidad)}</strong>
          <span className={styles.datoDetalle}>
            {formatearPorcentaje(ultimo.nacional.variacion_interanual_pct)} interanual
          </span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Comunidades por encima de la media</span>
          <strong className={styles.datoValor}>{porEncimaDeLaMedia}</strong>
          <span className={styles.datoDetalle}>de {ultimo.comunidades.length} con dato</span>
        </article>
        <article className={styles.dato}>
          <span className={styles.datoTitulo}>Casos señalados por jev</span>
          <strong className={styles.datoValor}>{noticiables.length}</strong>
          <span className={styles.datoDetalle}>
            {hayClasificacion ? "marcados como noticiables" : "clasificación pendiente"}
          </span>
        </article>
      </section>

      <section id="evolucion" className={styles.bloque}>
        <h2>Evolución trimestral</h2>
        <TendenciaChart series={series} opciones={opciones} opcionInicial={CLAVE_NACIONAL} />
      </section>

      <section id="mapa" className={styles.bloque}>
        <h2>Mapa de calor por comunidad</h2>
        <p className={styles.nota}>
          Tasa de litigiosidad (asuntos ingresados por cada 1.000 habitantes). Verde: menor
          carga relativa del periodo; rojo: mayor. Cambia a variación interanual para ver la
          evolución.
        </p>
        <Heatmap informes={informes} />
      </section>

      <section id="mapa-espana" className={styles.bloque}>
        <h2>Mapa de España · {etiquetaTrimestre(ultimo)}</h2>
        <MapaCcaa datos={datosMapa} etiqueta={etiquetaTrimestre(ultimo)} />
      </section>

      <section id="tabla" className={styles.bloque}>
        <h2>
          Último trimestre · {etiquetaTrimestre(ultimo)}
          {hayClasificacion ? "" : " (sin clasificar)"}
        </h2>
        {hayClasificacion ? null : (
          <p className={styles.aviso}>
            Define <code>TYPESAFE_AI_API_KEY</code> y ejecuta{" "}
            <code>npm run ingest -- --todas</code> para añadir tendencia, gravedad y
            noticiabilidad con jev.
          </p>
        )}
        <TablaUltimoTrimestre
          comunidades={ultimo.comunidades}
          etiqueta={etiquetaTrimestre(ultimo)}
          indices={indicesPlanos}
        />
      </section>

      {editorial ? (
        <div id="editorial">
          <Editorial resumen={editorial} />
        </div>
      ) : null}

      <footer className={styles.pie}>
        <p>
          Datos: notas de prensa trimestrales del CGPJ (difusión pública). Clasificación:
          modelo jev de TypeSafe AI con el AI SDK. Serie histórica completa:{" "}
          <a
            href="https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Informes-por-territorios-sobre-la-actividad-de-los-organos-judiciales"
            target="_blank"
            rel="noopener noreferrer"
          >
            informes por territorios
          </a>
          . Suscríbete por <Link href="/feed.xml">RSS</Link>.
        </p>
      </footer>

      <div id="faq">
        <Faq />
      </div>
    </main>
  );
}
