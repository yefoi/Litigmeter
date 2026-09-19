import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsearSeriesProvincias } from "../lib/litigiosidad/series-provincias";

const URL_SERIES =
  "https://www.poderjudicial.es/stfls/ESTADISTICA/FICHEROS/3002%20Series%20estadisticas/Series%20Tasa%20Litigiosidad%20por%20Provincias.xlsx";
const USER_AGENT = "litigmeter/0.1 (series de litigiosidad por provincia)";

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

  const serie = await parsearSeriesProvincias(Buffer.from(await respuesta.arrayBuffer()), {
    url,
    titulo: "Series Tasa de Litigiosidad por Provincias (CGPJ)",
  });

  const destino = path.join(baseDir, "anual", "litigiosidad-provincias.json");
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, `${JSON.stringify(serie, null, 2)}\n`, "utf8");

  const conDatos = serie.provincias.filter((provincia) =>
    provincia.valores.some((valor) => valor !== null),
  ).length;
  console.log(
    `Serie provincial ${serie.anios[0]}–${serie.anios.at(-1)} · ${conDatos} provincias · ${destino}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
