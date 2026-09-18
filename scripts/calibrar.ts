import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { leerInformes } from "../lib/litigiosidad/historico";
import {
  contarPorUmbral,
  umbralNoticiable,
  UMBRAL_NOTICIABLE_POR_DEFECTO,
} from "../lib/litigiosidad/noticiabilidad";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

const CABECERA = [
  "etiqueta_humana",
  "anio",
  "trimestre",
  "comunidad_autonoma",
  "probabilidad_noticiable",
  "noticiable_umbral_actual",
  "tendencia",
  "confianza_tendencia",
  "gravedad_congestion",
  "confianza_gravedad",
  "variacion_interanual_pct",
].join(",");

function aCsv(valor: string | number | undefined): string {
  if (valor === undefined) return "";
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  if (informes.length === 0) throw new Error("No hay informes trimestrales que calibrar");

  const umbral = umbralNoticiable();
  const filas = informes.flatMap((informe) =>
    informe.comunidades
      .filter((registro) => registro.clasificacion)
      .map((registro) => ({
        informe,
        registro,
        clasificacion: registro.clasificacion!,
      })),
  );
  const probabilidades = filas.map((fila) => fila.clasificacion.probabilidad_noticiable);

  console.log(`Muestras clasificadas: ${probabilidades.length}`);
  console.log(`Umbral actual: ${umbral} (por defecto ${UMBRAL_NOTICIABLE_POR_DEFECTO})`);
  console.log("Noticiables por umbral:");
  for (const conteo of contarPorUmbral(probabilidades)) {
    console.log(
      `  > ${conteo.umbral.toFixed(2)} → ${conteo.noticiables}/${conteo.total}` +
        `${conteo.umbral === umbral ? "  ← actual" : ""}`,
    );
  }

  const lineas = filas.map(({ informe, registro, clasificacion }) =>
    [
      "",
      informe.anio,
      informe.trimestre,
      registro.comunidad_autonoma,
      clasificacion.probabilidad_noticiable.toFixed(3),
      String(clasificacion.es_noticiable),
      clasificacion.tendencia,
      clasificacion.confianza_tendencia?.toFixed(3),
      clasificacion.gravedad_congestion.toFixed(2),
      clasificacion.confianza_gravedad?.toFixed(3),
      registro.variacion_interanual_pct?.toFixed(2),
    ]
      .map(aCsv)
      .join(","),
  );

  const destino = path.join(dataBase, "calibracion", "noticiabilidad.csv");
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, `${[CABECERA, ...lineas].join("\n")}\n`, "utf8");
  console.log(`\nCSV para etiquetar a mano: ${destino}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
