import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  claveMuestra,
  curvaUmbrales,
  leerEtiquetasCsv,
  mejorUmbral,
  metricasPorUmbral,
  type MuestraCalibracion,
} from "../lib/calibracion/metricas";
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

function aPorcentaje(valor: number): string {
  return `${(valor * 100).toFixed(0)} %`;
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  if (informes.length === 0) throw new Error("No hay informes trimestrales que calibrar");

  const rutaCsv = path.join(dataBase, "calibracion", "noticiabilidad.csv");
  let etiquetas = new Map<string, boolean>();
  try {
    etiquetas = leerEtiquetasCsv(await readFile(rutaCsv, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const umbral = umbralNoticiable();
  const filas = informes.flatMap((informe) =>
    informe.comunidades
      .filter((registro) => registro.clasificacion)
      .map((registro) => ({
        informe,
        registro,
        clasificacion: registro.clasificacion!,
        clave: claveMuestra(informe.anio, informe.trimestre, registro.comunidad_autonoma),
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

  const muestras: MuestraCalibracion[] = filas
    .filter((fila) => etiquetas.has(fila.clave))
    .map((fila) => ({
      probabilidad: fila.clasificacion.probabilidad_noticiable,
      etiqueta: etiquetas.get(fila.clave)!,
    }));

  if (muestras.length > 0) {
    console.log(`\nEtiquetas humanas: ${muestras.length}`);
    for (const metrica of curvaUmbrales(muestras)) {
      console.log(
        `  > ${metrica.umbral.toFixed(2)} → precisión ${aPorcentaje(metrica.precision)}, ` +
          `recall ${aPorcentaje(metrica.recall)}, F1 ${metrica.f1.toFixed(3)}`,
      );
    }
    const mejor = mejorUmbral(muestras);
    if (mejor) {
      const actual = metricasPorUmbral(muestras, umbral);
      console.log(
        `\nMejor F1: ${mejor.umbral.toFixed(2)} (F1 ${mejor.f1.toFixed(3)}) · ` +
          `umbral actual ${umbral}: F1 ${actual.f1.toFixed(3)}`,
      );
      if (mejor.umbral !== umbral) {
        console.log(`Sugerencia: pon UMBRAL_NOTICIABLE=${mejor.umbral} y reclasifica.`);
      }
    }
  } else {
    console.log(
      "\nSin etiquetas humanas todavía: rellena etiqueta_humana (1/0) en el CSV y vuelve a ejecutar.",
    );
  }

  const lineas = filas.map(({ informe, registro, clasificacion, clave }) =>
    [
      etiquetas.has(clave) ? (etiquetas.get(clave) ? "1" : "0") : "",
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

  await mkdir(path.dirname(rutaCsv), { recursive: true });
  await writeFile(rutaCsv, `${[CABECERA, ...lineas].join("\n")}\n`, "utf8");
  console.log(`\nCSV para etiquetar a mano: ${rutaCsv}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
