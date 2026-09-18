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
  nacional?: PuntoSerie[];
  destacados?: string[];
}

const SIN_COMPARACION = "";
const NOMBRE_NACIONAL = "Media nacional";

export default function TendenciaChart({
  series,
  opciones,
  opcionInicial,
  opcionesSecundarias,
  nacional,
  destacados,
}: Props) {
  const [seleccion, setSeleccion] = useState(opcionInicial);
  const [comparada, setComparada] = useState(SIN_COMPARACION);

  const principal = series[seleccion] ?? [];
  const secundaria = comparada ? series[comparada] ?? [] : [];
  const conjuntoDestacados = new Set(destacados ?? []);
  const mostrarNacional = seleccion !== NOMBRE_NACIONAL && (nacional?.length ?? 0) > 0;

  const datos = principal.map((punto, indice) => ({
    etiqueta: punto.etiqueta,
    principal: punto.tasa,
    comparada: comparada ? secundaria[indice]?.tasa ?? null : null,
    nacional: mostrarNacional ? nacional?.[indice]?.tasa ?? null : null,
    destacado: conjuntoDestacados.has(punto.etiqueta),
  }));

  const listaSecundaria = opcionesSecundarias ?? opciones;

  const punto = (props: unknown) => {
    const { cx, cy, payload } = props as {
      cx?: number;
      cy?: number;
      payload?: { destacado?: boolean };
    };
    if (typeof cx !== "number" || typeof cy !== "number") return <g />;
    if (payload?.destacado) {
      return <circle cx={cx} cy={cy} r={6} fill="#b45309" stroke="#ffffff" strokeWidth={2} />;
    }
    return <circle cx={cx} cy={cy} r={3.5} fill="#1d6fb8" />;
  };

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
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd3dc" strokeOpacity={0.6} />
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
            <Legend />
            <Line
              type="monotone"
              dataKey="principal"
              name={seleccion}
              stroke="#1d6fb8"
              strokeWidth={2}
              dot={punto}
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
            {mostrarNacional ? (
              <Line
                type="monotone"
                dataKey="nacional"
                name="Media nacional (referencia)"
                stroke="#8a94a0"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
