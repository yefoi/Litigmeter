import path from "node:path";
import { construirRss } from "@/lib/litigiosidad/feed";
import { leerInformes } from "@/lib/litigiosidad/historico";
import { sitioPublico } from "@/lib/sitio";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  const xml = construirRss(informes, sitioPublico());

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
