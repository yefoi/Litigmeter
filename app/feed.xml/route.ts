import path from "node:path";
import { construirRss } from "@/lib/litigiosidad/feed";
import { leerInformes } from "@/lib/litigiosidad/historico";

export const dynamic = "force-static";

function sitioPublico(): string {
  const produccion = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (produccion) return `https://${produccion}`;
  return "https://litigmeter.vercel.app";
}

export async function GET(): Promise<Response> {
  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  const xml = construirRss(informes, sitioPublico());

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
