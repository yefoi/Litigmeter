import type { MetadataRoute } from "next";
import path from "node:path";
import { COMUNIDADES } from "@/lib/litigiosidad/ccaa";
import { leerInformes } from "@/lib/litigiosidad/historico";
import { slugDeComunidad } from "@/lib/litigiosidad/presentacion";
import { sitioPublico } from "@/lib/sitio";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitio = sitioPublico();
  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  const ultimaFecha =
    informes.at(-1)?.fuente.fecha_publicacion ?? new Date().toISOString().slice(0, 10);

  const paginas: MetadataRoute.Sitemap = [
    { url: sitio, lastModified: ultimaFecha, changeFrequency: "weekly", priority: 1 },
    { url: `${sitio}/provincias`, lastModified: ultimaFecha, changeFrequency: "monthly", priority: 0.8 },
    { url: `${sitio}/violencia`, lastModified: ultimaFecha, changeFrequency: "monthly", priority: 0.7 },
    { url: `${sitio}/crisis`, lastModified: ultimaFecha, changeFrequency: "monthly", priority: 0.7 },
    { url: `${sitio}/divorcios`, lastModified: ultimaFecha, changeFrequency: "monthly", priority: 0.7 },
    { url: `${sitio}/contraste`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${sitio}/metodologia`, changeFrequency: "monthly", priority: 0.6 },
  ];

  for (const comunidad of COMUNIDADES) {
    paginas.push({
      url: `${sitio}/ccaa/${slugDeComunidad(comunidad.nombre)}`,
      lastModified: ultimaFecha,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return paginas;
}
