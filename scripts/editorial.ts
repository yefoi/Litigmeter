import path from "node:path";
import { escribirEditorial, leerEditorial } from "../lib/editorial/ficheros";
import { candidatosEditorial, elegirFoco, redactarEditorial } from "../lib/editorial/redactar";
import { leerEvidencias } from "../lib/edictos/evidencias";
import { leerInformes } from "../lib/litigiosidad/historico";

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
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const force = process.argv.includes("--force");

  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  const ultimo = informes.at(-1);
  if (!ultimo) throw new Error("No hay informes trimestrales; ejecuta primero npm run ingest");

  if (!force && (await leerEditorial(dataBase, ultimo.anio, ultimo.trimestre))) {
    console.log(`Resumen editorial ${ultimo.anio}-T${ultimo.trimestre} ya existe; nada que hacer.`);
    return;
  }

  const candidatos = candidatosEditorial(ultimo);
  const foco = await elegirFoco(ultimo, candidatos);
  const evidencias = (await leerEvidencias(path.join(dataBase, "edictos"), ultimo.anio, ultimo.trimestre))
    ?.comunidades;
  const resumen = redactarEditorial(ultimo, foco, evidencias);

  const destino = await escribirEditorial(dataBase, resumen);
  console.log(`Titular: ${resumen.titular}`);
  console.log(`Destacados: ${resumen.destacados.map((d) => d.comunidad_autonoma).join(", ")}`);
  console.log(`Escrito en ${destino}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
