"use client";

import { useState } from "react";
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
import type { PuntoSerie } from "@/lib/litigiosidad/presentacion";

interface Props {
  series: Record<string, PuntoSerie[]>;
  opciones: string[];
  opcionInicial: string;
  opcionesSecundarias?: string[];
}

const SIN_COMPARACION = "";

export default function TendenciaChart({
  series,
  opciones,
  opcionInicial,
  opcionesSecundarias,
}: Props) {
  const [seleccion, setSeleccion] = useState(opcionInicial);
  const [comparada, setComparada] = useState(SIN_COMPARACION);

  const principal = series[seleccion] ?? [];
  const secundaria = comparada ? series[comparada] ?? [] : [];
  const datos = principal.map((punto, indice) => ({
    etiqueta: punto.etiqueta,
    principal: punto.tasa,
    comparada: secundaria[indice]?.tasa ?? null,
  }));
  const listaSecundaria = opcionesSecundarias ?? opciones;

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
        <label htmlFor="selector-comparada">Comparar con</label>
        <select
          id="selector-comparada"
          value={comparada}
          onChange={(evento) => setComparada(evento.target.value)}
        >
          <option value={SIN_COMPARACION}>—</option>
          {listaSecundaria
            .filter((opcion) => opcion !== seleccion)
            .map((opcion) => (
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
              formatter={(valor, nombre) =>
                typeof valor === "number"
                  ? [`${valor.toFixed(2).replace(".", ",")} asuntos/1.000 hab.`, String(nombre)]
                  : [String(valor), String(nombre)]
              }
            />
            {comparada ? <Legend /> : null}
            <Line
              type="monotone"
              dataKey="principal"
              name={seleccion}
              stroke="#1d6fb8"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            {comparada ? (
              <Line
                type="monotone"
                dataKey="comparada"
                name={comparada}
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
