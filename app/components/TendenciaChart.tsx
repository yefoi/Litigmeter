"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PuntoSerie } from "@/lib/litigiosidad/presentacion";

interface Props {
  series: Record<string, PuntoSerie[]>;
  opciones: string[];
  opcionInicial: string;
}

export default function TendenciaChart({ series, opciones, opcionInicial }: Props) {
  const [seleccion, setSeleccion] = useState(opcionInicial);
  const datos = series[seleccion] ?? [];

  return (
    <div className="grafico">
      <div className="graficoCabecera">
        <label htmlFor="selector-series">Serie</label>
        <select
          id="selector-series"
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
      <div className="graficoLienzo">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
            <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              width={48}
              domain={["dataMin - 2", "dataMax + 2"]}
              tickFormatter={(valor: number) => valor.toFixed(0)}
            />
            <Tooltip
              formatter={(valor) =>
                typeof valor === "number"
                  ? [`${valor.toFixed(2).replace(".", ",")} asuntos/1.000 hab.`, seleccion]
                  : [String(valor), seleccion]
              }
            />
            <Line
              type="monotone"
              dataKey="tasa"
              stroke="#1d6fb8"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              name={seleccion}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
