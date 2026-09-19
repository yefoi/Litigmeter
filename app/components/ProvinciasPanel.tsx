"use client";

import { useState } from "react";
import SerieAnualChart, { type FilaAnual } from "./SerieAnualChart";

export default function ProvinciasPanel({
  series,
  provinciaInicial,
}: {
  series: Record<string, FilaAnual[]>;
  provinciaInicial: string;
}) {
  const [seleccion, setSeleccion] = useState(provinciaInicial);
  const opciones = Object.keys(series).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="grafico">
      <div className="graficoCabecera">
        <label htmlFor="selector-provincia">Provincia</label>
        <select
          id="selector-provincia"
          value={seleccion}
          onChange={(evento) => setSeleccion(evento.target.value)}
        >
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </div>
      <SerieAnualChart datos={series[seleccion] ?? []} comunidad={seleccion} />
    </div>
  );
}
