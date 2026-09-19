import path from "node:path";
import { parsearSeriesOrdenes, escribirSeriesOrdenes } from "../lib/ordenes/series";

const URL_SERIES =
  "https://www.poderjudicial.es/stfls/ESTADISTICA/FICHEROS/3002%20Series%20estadisticas/Series%20Asuntos.xlsx";
const USER_AGENT = "litigmeter/0.1 (series por orden jurisdiccional del CGPJ)";

function numero(valor: number | null): string {
  return valor === null ? "—" : valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function main(): Promise<void> {
  const respuesta = await fetch(URL_SERIES, { headers: { "user-agent": USER_AGENT } });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al descargar ${URL_SERIES}`);

  const serie = await parsearSeriesOrdenes(Buffer.from(await respuesta.arrayBuffer()), {
    url: URL_SERIES,
    titulo: "Series Asuntos por TSJ y orden jurisdiccional (CGPJ)",
  });

  const ruta = await escribirSeriesOrdenes(path.join(process.cwd(), "data"), serie);
  const anio = serie.anios.at(-1);
  const indice = serie.anios.length - 1;
  console.log(`Series por orden ${serie.anios[0]}-${anio} → ${path.relative(process.cwd(), ruta)}`);
  for (const orden of serie.ordenes) {
    console.log(
      `  ${orden.orden}: ${numero(orden.nacional.ingresados[indice])} asuntos ingresados en ${anio}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
