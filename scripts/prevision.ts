import path from "node:path";
import { leerInformes } from "../lib/litigiosidad/historico";
import {
  calcularAciertos,
  escribirPrevisiones,
  fusionarPrediccion,
  leerPrevisiones,
  predecirTrimestre,
  VERSION_PREVISIONES,
  type FicheroPrevisiones,
} from "../lib/prevision";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  if (informes.length === 0) throw new Error("No hay informes para calcular la previsión");

  const prediccion = predecirTrimestre(informes);
  if (!prediccion) throw new Error("No se pudo calcular la previsión");

  const existente: FicheroPrevisiones =
    (await leerPrevisiones(dataBase)) ?? {
      version_esquema: VERSION_PREVISIONES,
      generado_en: new Date().toISOString(),
      previsiones: [],
      aciertos: [],
    };

  const fusionado = fusionarPrediccion(existente, prediccion);
  const aciertos = calcularAciertos(informes, fusionado.previsiones);
  const fichero: FicheroPrevisiones = {
    ...fusionado,
    version_esquema: VERSION_PREVISIONES,
    generado_en: new Date().toISOString(),
    aciertos,
  };

  const destino = await escribirPrevisiones(dataBase, fichero);
  const ultimoAcierto = aciertos.at(-1);
  console.log(
    `Previsión ${prediccion.anio}-T${prediccion.trimestre} ` +
      `(nacional ${prediccion.nacional.tasa}) a partir de ${prediccion.generado_desde}`,
  );
  if (ultimoAcierto) {
    console.log(
      `Aciertos ${ultimoAcierto.anio}-T${ultimoAcierto.trimestre}: error medio ` +
        `${ultimoAcierto.error_medio} puntos, ${ultimoAcierto.dentro_5pct}/${ultimoAcierto.total} ` +
        "comunidades dentro del ±5 %",
    );
  }
  console.log(`Escrito en ${destino}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
