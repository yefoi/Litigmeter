import { ImageResponse } from "next/og";
import path from "node:path";
import { leerInformes } from "@/lib/litigiosidad/historico";
import {
  comunidadDeSlug,
  confianzaMinima,
  etiquetaGravedad,
  etiquetaTrimestre,
  formatearConfianza,
  formatearPorcentaje,
  formatearTasa,
} from "@/lib/litigiosidad/presentacion";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comunidad = comunidadDeSlug(slug) ?? "Comunidad";
  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  const ultimo = informes.at(-1);
  const registro = ultimo?.comunidades.find((c) => c.comunidad_autonoma === comunidad);
  const clasificacion = registro?.clasificacion;

  const metricas = [
    { etiqueta: "Interanual", valor: formatearPorcentaje(registro?.variacion_interanual_pct) },
    {
      etiqueta: "Gravedad",
      valor: clasificacion ? etiquetaGravedad(clasificacion.gravedad_congestion) : "—",
    },
    {
      etiqueta: "Confianza",
      valor: formatearConfianza(confianzaMinima(clasificacion)),
    },
  ];

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
          <span style={{ fontSize: 68, fontWeight: 700 }}>{comunidad}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 16 }}>
            <span style={{ fontSize: 96, fontWeight: 700 }}>
              {formatearTasa(registro?.tasa_litigiosidad)}
            </span>
            <span style={{ fontSize: 30, color: "#cbd5e1" }}>
              asuntos por 1.000 habitantes
              {registro ? ` · pos. ${registro.posicion_nacional}` : ""}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
          {metricas.map((metrica) => (
            <div
              key={metrica.etiqueta}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#1e293b",
                borderRadius: 16,
                padding: "18px 26px",
                minWidth: 260,
              }}
            >
              <span style={{ fontSize: 24, color: "#94a3b8" }}>{metrica.etiqueta}</span>
              <span style={{ fontSize: 36, fontWeight: 600, color: "#7dd3fc" }}>
                {metrica.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
