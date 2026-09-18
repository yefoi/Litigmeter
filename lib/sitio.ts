/** URL pública del sitio para RSS y OpenGraph; Vercel la expone en producción. */
export function sitioPublico(): string {
  const produccion = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (produccion) return `https://${produccion}`;
  return "https://litigmeter.vercel.app";
}
