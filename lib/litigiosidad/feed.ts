import { etiquetaTrimestre, formatearPorcentaje, formatearTasa } from "./presentacion";
import type { InformeTrimestral } from "./tipos";

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function construirRssComunidad(
  informes: InformeTrimestral[],
  comunidad: string,
  slug: string,
  sitio: string,
): string {
  const items = [...informes]
    .reverse()
    .slice(0, 20)
    .map((informe) => {
      const registro = informe.comunidades.find(
        (candidato) => candidato.comunidad_autonoma === comunidad,
      );
      const clasificacion = registro?.clasificacion;
      const titulo = `${comunidad} · ${etiquetaTrimestre(informe)}: ${formatearTasa(
        registro?.tasa_litigiosidad,
      )}`;
      const descripcion =
        [
          registro
            ? `Variación interanual ${formatearPorcentaje(registro.variacion_interanual_pct)}`
            : "Sin dato en este informe",
          clasificacion ? `tendencia ${clasificacion.tendencia}` : undefined,
          clasificacion?.es_noticiable ? "marcada como noticiable" : undefined,
        ]
          .filter((parte): parte is string => Boolean(parte))
          .join(" · ") + ".";
      const fecha = informe.fuente.fecha_publicacion ?? informe.generado_en.slice(0, 10);
      const pubDate = new Date(`${fecha}T06:00:00Z`).toUTCString();
      const enlace = `${sitio}/ccaa/${slug}`;

      return [
        "    <item>",
        `      <title>${escaparXml(titulo)}</title>`,
        `      <link>${escaparXml(enlace)}</link>`,
        `      <guid isPermaLink="true">${escaparXml(`${enlace}#${etiquetaTrimestre(informe)}`)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escaparXml(descripcion)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>Litigmeter · ${escaparXml(comunidad)}</title>`,
    `    <link>${escaparXml(`${sitio}/ccaa/${slug}`)}</link>`,
    `    <description>Litigiosidad trimestral de ${escaparXml(comunidad)} según las notas del CGPJ.</description>`,
    "    <language>es</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

export function construirRss(informes: InformeTrimestral[], sitio: string): string {
  const items = [...informes]
    .reverse()
    .slice(0, 20)
    .map((informe) => {
      const top = [...informe.comunidades]
        .sort((a, b) => b.tasa_litigiosidad - a.tasa_litigiosidad)
        .slice(0, 3)
        .map((c) => `${c.comunidad_autonoma} ${c.tasa_litigiosidad.toFixed(1).replace(".", ",")}`)
        .join(" · ");
      const titulo = `Litigiosidad ${etiquetaTrimestre(informe)}: ${formatearTasa(informe.nacional.tasa_litigiosidad)} asuntos por 1.000 habitantes`;
      const descripcion =
        `Tasas más altas: ${top}. ` +
        `Variación interanual nacional: ${formatearPorcentaje(informe.nacional.variacion_interanual_pct)}.`;
      const fecha = informe.fuente.fecha_publicacion ?? informe.generado_en.slice(0, 10);
      const pubDate = new Date(`${fecha}T06:00:00Z`).toUTCString();

      return [
        "    <item>",
        `      <title>${escaparXml(titulo)}</title>`,
        `      <link>${escaparXml(informe.fuente.url)}</link>`,
        `      <guid isPermaLink="true">${escaparXml(informe.fuente.url)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escaparXml(descripcion)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>Litigmeter · litigiosidad judicial por CCAA</title>",
    `    <link>${escaparXml(sitio)}</link>`,
    "    <description>Tasa de litigiosidad trimestral por comunidad autónoma a partir de las notas del CGPJ.</description>",
    "    <language>es</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
