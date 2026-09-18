import { ingestaDeFeed, ingestaTrimestral } from "../lib/litigiosidad/ingest";

function cargarEnvLocal(): void {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // Sin .env local: se usan las variables del entorno tal cual.
  }
}

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function main(): Promise<void> {
  cargarEnvLocal();
  const opciones = {
    url: opcion("url"),
    dataDir: opcion("data"),
    sinClasificar: process.argv.includes("--sin-clasificar"),
    force: process.argv.includes("--force"),
    reclasificar: process.argv.includes("--reclasificar"),
  };

  if (process.argv.includes("--todas")) {
    const resultados = await ingestaDeFeed(opciones);
    console.log("\nResumen de la ingesta múltiple:");
    for (const resultado of resultados) {
      console.log(
        `  ${resultado.estado.padEnd(12)} ${resultado.informe.anio}-T${resultado.informe.trimestre}` +
          `  clasificadas: ${resultado.clasificados}`,
      );
    }
    return;
  }

  const resultado = await ingestaTrimestral(opciones);
  console.log("");
  console.log(`Estado: ${resultado.estado}`);
  console.log(`Fichero: ${resultado.fichero}`);
  console.log(`Clasificadas en esta ejecución: ${resultado.clasificados}`);
  if (resultado.clasificacionOmitida) {
    console.log("Clasificación inactiva: define TYPESAFE_AI_API_KEY para activarla.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
