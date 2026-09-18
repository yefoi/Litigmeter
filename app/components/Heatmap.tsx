"use client";

import Link from "next/link";
import { useState } from "react";
import {
  colorDivergente,
  colorHeatmap,
  etiquetaTrimestre,
  formatearPorcentaje,
  formatearTasa,
  nombresDeComunidades,
  slugDeComunidad,
} from "@/lib/litigiosidad/presentacion";
import type { InformeTrimestral } from "@/lib/litigiosidad/tipos";

type Modo = "nivel" | "cambio";

export default function Heatmap({ informes }: { informes: InformeTrimestral[] }) {
  const [modo, setModo] = useState<Modo>("nivel");
  const nombres = nombresDeComunidades(informes);

  const valores = informes
    .flatMap((informe) =>
      informe.comunidades.map((comunidad) =>
        modo === "nivel" ? comunidad.tasa_litigiosidad : comunidad.variacion_interanual_pct,
      ),
    )
    .filter((valor): valor is number => typeof valor === "number");
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const maxAbsoluto = Math.max(1, ...valores.map((valor) => Math.abs(valor)));

  return (
    <div>
      <div className="heatmapBarra">
        <div className="selectorModo" role="group" aria-label="Métrica del mapa">
          <button
            type="button"
            aria-pressed={modo === "nivel"}
            onClick={() => setModo("nivel")}
          >
            Nivel
          </button>
          <button
            type="button"
            aria-pressed={modo === "cambio"}
            onClick={() => setModo("cambio")}
          >
            Cambio interanual
          </button>
        </div>
        <div className="leyenda">
          <span>{modo === "nivel" ? "Menor carga" : "Baja más"}</span>
          <span className={`leyendaBarra ${modo}`} aria-hidden="true" />
          <span>{modo === "nivel" ? "Mayor carga" : "Sube más"}</span>
        </div>
      </div>

      <div className="heatmapContenedor">
        <table className="heatmap">
          <caption className="fuera">
            Tasa de litigiosidad por comunidad autónoma y trimestre
          </caption>
          <thead>
            <tr>
              <th scope="col">Comunidad</th>
              {informes.map((informe) => (
                <th key={etiquetaTrimestre(informe)} scope="col">
                  {etiquetaTrimestre(informe)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nombres.map((nombre) => (
              <tr key={nombre}>
                <th scope="row">
                  <Link href={`/ccaa/${slugDeComunidad(nombre)}`}>{nombre}</Link>
                </th>
                {informes.map((informe) => {
                  const registro = informe.comunidades.find(
                    (comunidad) => comunidad.comunidad_autonoma === nombre,
                  );
                  const etiqueta = etiquetaTrimestre(informe);

                  if (modo === "nivel") {
                    const valor = registro?.tasa_litigiosidad;
                    return (
                      <td
                        key={etiqueta}
                        className={valor === undefined ? "vacio" : undefined}
                        style={
                          valor !== undefined
                            ? { backgroundColor: colorHeatmap(valor, minimo, maximo) }
                            : undefined
                        }
                        title={
                          valor !== undefined
                            ? `${nombre} · ${etiqueta}: ${formatearTasa(valor)} asuntos por 1.000 habitantes`
                            : `${nombre} · ${etiqueta}: sin dato publicado`
                        }
                      >
                        {formatearTasa(valor)}
                      </td>
                    );
                  }

                  const cambio = registro?.variacion_interanual_pct;
                  return (
                    <td
                      key={etiqueta}
                      className={cambio === undefined ? "vacio" : undefined}
                      style={
                        cambio !== undefined
                          ? { backgroundColor: colorDivergente(cambio, maxAbsoluto) }
                          : undefined
                      }
                      title={
                        cambio !== undefined
                          ? `${nombre} · ${etiqueta}: ${formatearPorcentaje(cambio)} interanual`
                          : `${nombre} · ${etiqueta}: sin dato para calcular la variación`
                      }
                    >
                      {cambio === undefined ? "—" : formatearPorcentaje(cambio)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
