import path from "node:path";
import { COMUNIDADES } from "@/lib/litigiosidad/ccaa";
import { construirRssComunidad } from "@/lib/litigiosidad/feed";
import { leerInformes } from "@/lib/litigiosidad/historico";
import { comunidadDeSlug, slugDeComunidad } from "@/lib/litigiosidad/presentacion";
import { sitioPublico } from "@/lib/sitio";

export const dynamic = "force-static";

export function generateStaticParams() {
  return COMUNIDADES.map((comunidad) => ({ slug: slugDeComunidad(comunidad.nombre) }));
}

export async function GET(
  _peticion: Request,
  contexto: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await contexto.params;
  const comunidad = comunidadDeSlug(slug) ?? "Comunidad";
  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  const xml = construirRssComunidad(informes, comunidad, slug, sitioPublico());

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
