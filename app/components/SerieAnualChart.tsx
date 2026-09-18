"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface FilaAnual {
  anio: number;
  comunidad: number | null;
  nacional: number | null;
}

export default function SerieAnualChart({
  datos,
  comunidad,
}: {
  datos: FilaAnual[];
  comunidad: string;
}) {
  return (
    <div className="graficoLienzo">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
          <XAxis dataKey="anio" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={48}
            domain={["dataMin - 5", "dataMax + 5"]}
            tickFormatter={(valor: number) => valor.toFixed(0)}
          />
          <Tooltip
            labelFormatter={(etiqueta) => `Año ${etiqueta}`}
            formatter={(valor, nombre) =>
              typeof valor === "number"
                ? [`${valor.toFixed(2).replace(".", ",")} asuntos/1.000 hab.`, String(nombre)]
                : [String(valor), String(nombre)]
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="comunidad"
            name={comunidad}
            stroke="#1d6fb8"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="nacional"
            name="Media nacional"
            stroke="#8a94a0"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
