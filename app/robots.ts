import type { MetadataRoute } from "next";
import { sitioPublico } from "@/lib/sitio";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${sitioPublico()}/sitemap.xml`,
  };
}
