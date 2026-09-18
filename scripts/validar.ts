import path from "node:path";
import { validarDatos } from "../lib/esquemas";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const errores = await validarDatos(dataBase);

  if (errores.length === 0) {
    console.log(`Datos válidos en ${dataBase}`);
    return;
  }

  for (const { ruta, error } of errores) {
    console.error(`[error] ${ruta}: ${error}`);
  }
  throw new Error(`${errores.length} fichero(s) con errores de validación`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
