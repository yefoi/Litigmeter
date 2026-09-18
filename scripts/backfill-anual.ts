import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsearSeriesAnuales } from "../lib/litigiosidad/series";

const URL_SERIES =
  "https://www.poderjudicial.es/stfls/ESTADISTICA/FICHEROS/3002%20Series%20estadisticas/Series%20Tasa%20Litigiosidad.xlsx";
const USER_AGENT = "litigmeter/0.1 (backfill de series anuales del CGPJ)";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function main(): Promise<void> {
  const url = opcion("url") ?? URL_SERIES;
  const baseDir = opcion("data") ?? path.join(process.cwd(), "data");

  console.log(`Descargando ${url}`);
  const respuesta = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al descargar las series`);

  const serie = await parsearSeriesAnuales(Buffer.from(await respuesta.arrayBuffer()), {
    url,
    titulo: "Series Tasa de Litigiosidad por TSJ (CGPJ)",
  });

  const destino = path.join(baseDir, "anual", "litigiosidad-anual.json");
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, `${JSON.stringify(serie, null, 2)}\n`, "utf8");

  const conDatos = serie.comunidades.filter((c) => c.valores.some((v) => v !== null)).length;
  console.log(`Serie anual ${serie.anios[0]}–${serie.anios.at(-1)} · ${conDatos} CCAA · ${destino}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
