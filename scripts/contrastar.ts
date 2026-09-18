import path from "node:path";
import { contrastarAfirmacion, validarAfirmacion } from "../lib/contraste";
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
  if (!process.env.TYPESAFE_AI_API_KEY?.trim()) {
    throw new Error("Define TYPESAFE_AI_API_KEY para contrastar afirmaciones");
  }
  const afirmacion = opcion("afirmacion");
  if (!afirmacion) {
    throw new Error('Uso: npm run contrastar -- --afirmacion="..."');
  }
  const error = validarAfirmacion(afirmacion);
  if (error) throw new Error(error);

  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  const contraste = await contrastarAfirmacion(afirmacion, informes);

  console.log(`Afirmación: ${afirmacion}`);
  console.log(`Veredicto: ${contraste.veredicto}` + (contraste.confianza !== undefined ? ` (confianza ${(contraste.confianza * 100).toFixed(0)} %)` : ""));
  console.log(`Ámbito: ${contraste.ambito}`);
  console.log(`Evidencia: ${contraste.evidencia}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
