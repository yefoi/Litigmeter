import { ImageResponse } from "next/og";
import path from "node:path";
import { leerInformes } from "@/lib/litigiosidad/historico";
import { etiquetaTrimestre, formatearTasa } from "@/lib/litigiosidad/presentacion";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Litigmeter · litigiosidad judicial por CCAA";

export default async function Image() {
  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  const ultimo = informes.at(-1);
  const destacadas = ultimo?.comunidades.slice(0, 3) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0f172a",
          color: "#f8fafc",
          padding: "56px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#93c5fd",
          }}
        >
          <span>Litigmeter</span>
          <span>{ultimo ? etiquetaTrimestre(ultimo) : "—"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          <span style={{ fontSize: 44, color: "#cbd5e1" }}>
            Litigiosidad judicial por comunidad autónoma
          </span>
          <span style={{ fontSize: 96, fontWeight: 700, marginTop: 12 }}>
            {ultimo ? formatearTasa(ultimo.nacional.tasa_litigiosidad) : "—"}
          </span>
          <span style={{ fontSize: 32, color: "#cbd5e1" }}>
            asuntos por 1.000 habitantes · media nacional
          </span>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: "auto" }}>
          {destacadas.map((comunidad) => (
            <div
              key={comunidad.comunidad_autonoma}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#1e293b",
                borderRadius: 16,
                padding: "20px 28px",
                minWidth: 320,
              }}
            >
              <span style={{ fontSize: 30 }}>{comunidad.comunidad_autonoma}</span>
              <span style={{ fontSize: 40, fontWeight: 700, color: "#7dd3fc" }}>
                {formatearTasa(comunidad.tasa_litigiosidad)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
