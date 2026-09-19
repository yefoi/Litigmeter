"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../page.module.css";
import {
  confianzaMinima,
  etiquetaGravedad,
  formatearConfianza,
  formatearPorcentaje,
  formatearTasa,
  slugDeComunidad,
} from "@/lib/litigiosidad/presentacion";
import type { RegistroComunidad, Tendencia } from "@/lib/litigiosidad/tipos";

const CLASE_TENDENCIA: Record<Tendencia, string> = {
  mejora: "tendenciaMejora",
  estable: "tendenciaEstable",
  empeora: "tendenciaEmpeora",
};

type Campo =
  | "posicion_nacional"
  | "comunidad_autonoma"
  | "tasa_litigiosidad"
  | "diferencial_vs_nacional"
  | "variacion_interanual_pct"
  | "indice"
  | "gravedad";

function valorDe(
  registro: RegistroComunidad,
  campo: Campo,
  indices: Record<string, number>,
): number | string {
  switch (campo) {
    case "comunidad_autonoma":
      return registro.comunidad_autonoma;
    case "tasa_litigiosidad":
      return registro.tasa_litigiosidad;
    case "diferencial_vs_nacional":
      return registro.diferencial_vs_nacional ?? 0;
    case "variacion_interanual_pct":
      return registro.variacion_interanual_pct ?? 0;
    case "indice":
      return indices[registro.comunidad_autonoma] ?? -1;
    case "gravedad":
      return registro.clasificacion?.gravedad_congestion ?? -1;
    default:
      return registro.posicion_nacional;
  }
}

function aCsv(valor: string | number | undefined): string {
  if (valor === undefined) return "";
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export default function TablaUltimoTrimestre({
  comunidades,
  etiqueta,
  indices = {},
}: {
  comunidades: RegistroComunidad[];
  etiqueta: string;
  indices?: Record<string, number>;
}) {
  const [orden, setOrden] = useState<{ campo: Campo; direccion: "asc" | "desc" }>({
    campo: "posicion_nacional",
    direccion: "asc",
  });
  const [filtro, setFiltro] = useState("");
  const [soloNoticiables, setSoloNoticiables] = useState(false);

  const filas = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    const filtradas = comunidades.filter((comunidad) => {
      if (soloNoticiables && !comunidad.clasificacion?.es_noticiable) return false;
      return comunidad.comunidad_autonoma.toLowerCase().includes(texto);
    });
    const factor = orden.direccion === "asc" ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const valorA = valorDe(a, orden.campo, indices);
      const valorB = valorDe(b, orden.campo, indices);
      if (typeof valorA === "string" || typeof valorB === "string") {
        return String(valorA).localeCompare(String(valorB), "es") * factor;
      }
      return (valorA - valorB) * factor;
    });
  }, [comunidades, filtro, indices, orden, soloNoticiables]);

  const alternarOrden = (campo: Campo) => {
    setOrden((actual) =>
      actual.campo === campo
        ? { campo, direccion: actual.direccion === "asc" ? "desc" : "asc" }
        : { campo, direccion: campo === "comunidad_autonoma" ? "asc" : "desc" },
    );
  };

  const descargarCsv = () => {
    const cabecera = [
      "posicion",
      "comunidad_autonoma",
      "tasa_litigiosidad",
      "diferencial_vs_nacional",
      "variacion_interanual_pct",
      "indice",
      "tendencia",
      "gravedad",
      "confianza_minima",
      "es_noticiable",
      "probabilidad_noticiable",
    ];
    const lineas = filas.map((c) => [
      c.posicion_nacional,
      c.comunidad_autonoma,
      c.tasa_litigiosidad,
      c.diferencial_vs_nacional,
      c.variacion_interanual_pct,
      indices[c.comunidad_autonoma],
      c.clasificacion?.tendencia,
      c.clasificacion ? etiquetaGravedad(c.clasificacion.gravedad_congestion) : undefined,
      confianzaMinima(c.clasificacion)?.toFixed(2),
      c.clasificacion?.es_noticiable ? "si" : "no",
      c.clasificacion?.probabilidad_noticiable.toFixed(3),
    ]);
    const csv = [cabecera, ...lineas].map((fila) => fila.map(aCsv).join(",")).join("\n");
    const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `litigmeter-${etiqueta.replace(/\s+/g, "-").toLowerCase()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const encabezado = (campo: Campo, texto: string, ayuda?: string) => (
    <th
      scope="col"
      title={ayuda}
      aria-sort={orden.campo === campo ? (orden.direccion === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className={styles.ordenBoton} onClick={() => alternarOrden(campo)}>
        {texto}
        <span aria-hidden="true" className={styles.ordenFlecha}>
          {orden.campo === campo ? (orden.direccion === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );

  return (
    <div>
      <div className={styles.controlesTabla}>
        <label>
          <span className={styles.controlEtiqueta}>Buscar</span>
          <input
            type="search"
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
            placeholder="Comunidad…"
            className={styles.controlEntrada}
          />
        </label>
        <label className={styles.controlCheck}>
          <input
            type="checkbox"
            checked={soloNoticiables}
            onChange={(evento) => setSoloNoticiables(evento.target.checked)}
          />
          Solo noticiables
        </label>
        <button type="button" className={styles.controlBoton} onClick={descargarCsv}>
          Descargar CSV
        </button>
        <span className={styles.controlContador}>
          {filas.length} de {comunidades.length}
        </span>
      </div>

      <div className={`${styles.tablaContenedor} ${styles.soloEscritorio}`}>
        <table className={styles.tabla}>
          <caption className="fuera">Último trimestre por comunidad autónoma</caption>
          <thead>
            <tr>
              {encabezado("posicion_nacional", "#", "Puesto en el ranking del trimestre (1 = más litigiosidad)")}
              {encabezado("comunidad_autonoma", "Comunidad", "Comunidad autónoma")}
              {encabezado("tasa_litigiosidad", "Tasa", "Asuntos nuevos por cada 1.000 habitantes. Cuanto más alta, más carga")}
              {encabezado("diferencial_vs_nacional", "vs media", "Diferencia en puntos con la media nacional. Positivo = por encima")}
              {encabezado("variacion_interanual_pct", "Interanual", "Subida o bajada respecto al mismo trimestre del año anterior")}
              {encabezado("indice", "Índice", "Índice Litigmeter (0-100): combina nivel, tendencia, congestión y pendencia")}
              <th scope="col" title="Mejora / estable / empeora respecto al trimestre anterior">
                Tendencia
              </th>
              {encabezado("gravedad", "Gravedad", "De 1 (sin problema) a 5 (crítica), comparando con España y su historia")}
              <th scope="col" title="Cómo de segura está la IA de su respuesta; por debajo del 50 %, tómalo con cautela">
                Confianza
              </th>
              <th scope="col" title="Si el dato es lo bastante inusual como para destacarlo (con la probabilidad que le da la IA)">
                Noticiable
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((comunidad) => (
              <tr key={comunidad.comunidad_autonoma}>
                <td className={styles.posicion}>{comunidad.posicion_nacional}</td>
                <td className={styles.comunidad}>
                  <Link href={`/ccaa/${slugDeComunidad(comunidad.comunidad_autonoma)}`}>
                    {comunidad.comunidad_autonoma}
                  </Link>
                </td>
                <td>{formatearTasa(comunidad.tasa_litigiosidad)}</td>
                <td>{formatearPorcentaje(comunidad.diferencial_vs_nacional)}</td>
                <td>{formatearPorcentaje(comunidad.variacion_interanual_pct)}</td>
                <td>
                  {indices[comunidad.comunidad_autonoma] !== undefined
                    ? indices[comunidad.comunidad_autonoma].toFixed(1).replace(".", ",")
                    : "—"}
                </td>
                <td>
                  {comunidad.clasificacion ? (
                    <span
                      className={`${styles.insignia} ${styles[CLASE_TENDENCIA[comunidad.clasificacion.tendencia]]}`}
                    >
                      {comunidad.clasificacion.tendencia}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {comunidad.clasificacion
                    ? etiquetaGravedad(comunidad.clasificacion.gravedad_congestion)
                    : "—"}
                </td>
                <td
                  className={
                    (confianzaMinima(comunidad.clasificacion) ?? 1) < 0.5
                      ? styles.confianzaBaja
                      : undefined
                  }
                >
                  {formatearConfianza(confianzaMinima(comunidad.clasificacion))}
                </td>
                <td>
                  {comunidad.clasificacion
                    ? comunidad.clasificacion.es_noticiable
                      ? `sí (${Math.round(comunidad.clasificacion.probabilidad_noticiable * 100)} %)`
                      : "no"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={styles.soloMovil}>
        {filas.map((comunidad) => (
          <li key={comunidad.comunidad_autonoma} className={styles.tarjeta}>
            <div className={styles.tarjetaCabecera}>
              <span className={styles.posicion}>{comunidad.posicion_nacional}</span>
              <Link href={`/ccaa/${slugDeComunidad(comunidad.comunidad_autonoma)}`}>
                {comunidad.comunidad_autonoma}
              </Link>
              {comunidad.clasificacion ? (
                <span
                  className={`${styles.insignia} ${styles[CLASE_TENDENCIA[comunidad.clasificacion.tendencia]]}`}
                >
                  {comunidad.clasificacion.tendencia}
                </span>
              ) : null}
            </div>
            <dl className={styles.tarjetaDatos}>
              <div>
                <dt>Tasa</dt>
                <dd>{formatearTasa(comunidad.tasa_litigiosidad)}</dd>
              </div>
              <div>
                <dt>vs media</dt>
                <dd>{formatearPorcentaje(comunidad.diferencial_vs_nacional)}</dd>
              </div>
              <div>
                <dt>Interanual</dt>
                <dd>{formatearPorcentaje(comunidad.variacion_interanual_pct)}</dd>
              </div>
              <div>
                <dt>Índice</dt>
                <dd>
                  {indices[comunidad.comunidad_autonoma] !== undefined
                    ? indices[comunidad.comunidad_autonoma].toFixed(1).replace(".", ",")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Gravedad</dt>
                <dd>
                  {comunidad.clasificacion
                    ? etiquetaGravedad(comunidad.clasificacion.gravedad_congestion)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Noticiable</dt>
                <dd>
                  {comunidad.clasificacion
                    ? comunidad.clasificacion.es_noticiable
                      ? `sí (${Math.round(comunidad.clasificacion.probabilidad_noticiable * 100)} %)`
                      : "no"
                    : "—"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
