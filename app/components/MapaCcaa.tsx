"use client";

import { useState } from "react";
import Spain from "@svg-maps/spain";
import { colorHeatmap, formatearTasa, slugDeComunidad } from "@/lib/litigiosidad/presentacion";

const COMUNIDAD_POR_ID: Record<string, string> = {
  andalusia: "Andalucía",
  aragon: "Aragón",
  asturias: "Asturias",
  "balearic-islands": "Baleares",
  "basque-country": "País Vasco",
  "canary-islands": "Canarias",
  cantabria: "Cantabria",
  "castile-and-leon": "Castilla y León",
  "castile-la-mancha": "Castilla-La Mancha",
  catalonia: "Cataluña",
  extremadura: "Extremadura",
  galicia: "Galicia",
  "la-rioja": "La Rioja",
  madrid: "Madrid",
  murcia: "Murcia",
  navarre: "Navarra",
  valencia: "Comunidad Valenciana",
};

type Modo = "tasa" | "indice";

const UBICACIONES = Spain.locations as Array<{ id: string; name: string; path: string }>;

export default function MapaCcaa({
  datos,
  etiqueta,
}: {
  datos: Record<string, { tasa: number; indice?: number }>;
  etiqueta: string;
}) {
  const [modo, setModo] = useState<Modo>("tasa");

  const valores = Object.values(datos)
    .map((dato) => (modo === "tasa" ? dato.tasa : dato.indice))
    .filter((valor): valor is number => typeof valor === "number");
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);

  return (
    <div>
      <div className="heatmapBarra">
        <div className="selectorModo" role="group" aria-label="Métrica del mapa">
          <button type="button" aria-pressed={modo === "tasa"} onClick={() => setModo("tasa")}>
            Tasa
          </button>
          <button
            type="button"
            aria-pressed={modo === "indice"}
            onClick={() => setModo("indice")}
          >
            Índice Litigmeter
          </button>
        </div>
        <div className="leyenda">
          <span>Menor</span>
          <span className="leyendaBarra nivel" aria-hidden="true" />
          <span>Mayor</span>
        </div>
      </div>

      <div className="mapaContenedor">
        <svg viewBox={Spain.viewBox} role="img" aria-label={`Mapa de España · ${etiqueta}`}>
          {UBICACIONES.map((location) => {
            const comunidad = COMUNIDAD_POR_ID[location.id];
            const dato = comunidad ? datos[comunidad] : undefined;
            const valor = modo === "tasa" ? dato?.tasa : dato?.indice;
            const relleno =
              typeof valor === "number"
                ? colorHeatmap(valor, minimo, maximo)
                : "var(--superficie-suave)";
            const titulo =
              comunidad && dato
                ? `${comunidad} · ${etiqueta}: ${formatearTasa(dato.tasa)}` +
                  (dato.indice !== undefined
                    ? ` · índice ${dato.indice.toFixed(1).replace(".", ",")}`
                    : "")
                : `${location.name}: sin dato`;

            const figura = (
              <path d={location.path} fill={relleno}>
                <title>{titulo}</title>
              </path>
            );

            if (!comunidad) {
              return <g key={location.id}>{figura}</g>;
            }

            return (
              <a
                key={location.id}
                href={`/ccaa/${slugDeComunidad(comunidad)}`}
                aria-label={`Ver ${comunidad}`}
              >
                {figura}
              </a>
            );
          })}
        </svg>
      </div>

      <p className="mapaNota">
        {modo === "tasa"
          ? `Asuntos ingresados por cada 1.000 habitantes · ${etiqueta}.`
          : `Índice Litigmeter de presión judicial (0–100) · ${etiqueta}.`}{" "}
        Clic en una comunidad para abrir su ficha.
      </p>
    </div>
  );
}
