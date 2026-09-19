import path from "node:path";
import { escribirInformeDivorcios, leerInformeDivorcios } from "../lib/divorcios/ficheros";
import { parsearNotaDivorcios } from "../lib/divorcios/parser";
import {
  candidatasDelFeed,
  descargar,
  opcion,
  type NotaCandidata,
} from "../lib/notas/feed";

function coincide(titulo: string): boolean {
  return /disoluci[oó]n matrimonial|divorcio|separaciones/i.test(titulo) && /trimestre/i.test(titulo);
}

async function ingerir(
  dataBaseDir: string,
  candidata: NotaCandidata,
  force: boolean,
): Promise<"creado" | "omitido" | "error"> {
  try {
    const informe = parsearNotaDivorcios(await descargar(candidata.url), candidata.url);
    if (!force && (await leerInformeDivorcios(dataBaseDir, informe.anio, informe.trimestre))) {
      return "omitido";
    }
    await escribirInformeDivorcios(dataBaseDir, informe);
    console.log(
      `  ${informe.anio}-T${informe.trimestre}: ${informe.nacional.total} demandas, ` +
        `${informe.comunidades.length} CCAA → data/divorcios`,
    );
    return "creado";
  } catch (error) {
    console.error(
      `  [error] ${candidata.titulo.slice(0, 60)}: ${error instanceof Error ? error.message : error}`,
    );
    return "error";
  }
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const force = process.argv.includes("--force");
  const urlDirecta = opcion("url");

  const candidatas: NotaCandidata[] = urlDirecta
    ? [{ url: urlDirecta, titulo: urlDirecta }]
    : process.argv.includes("--todas")
      ? await candidatasDelFeed(coincide)
      : (await candidatasDelFeed(coincide)).slice(0, 1);

  if (candidatas.length === 0) {
    console.log("Sin notas trimestrales de disolución matrimonial en el feed; nada que hacer.");
    return;
  }

  let creados = 0;
  for (const candidata of candidatas) {
    const resultado = await ingerir(dataBase, candidata, force);
    if (resultado === "creado") creados++;
  }
  console.log(`Disolución matrimonial: ${creados} informes nuevos de ${candidatas.length} notas.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
