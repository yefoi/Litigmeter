import path from "node:path";
import { leerInformes } from "../lib/litigiosidad/historico";
import { esPosteriorOIgual, trimestreEsperado } from "../lib/watchdog";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  const esperado = trimestreEsperado(new Date());

  if (informes.length === 0) {
    throw new Error(
      `No hay informes guardados y ya tocaría el ${esperado.anio}-T${esperado.trimestre}`,
    );
  }

  const ultimo = informes[informes.length - 1];
  if (esPosteriorOIgual(ultimo, esperado)) {
    console.log(
      `Al día: último informe ${ultimo.anio}-T${ultimo.trimestre}, esperado ${esperado.anio}-T${esperado.trimestre} (${esperado.fechaEsperada}).`,
    );
    return;
  }

  throw new Error(
    `Falta el informe ${esperado.anio}-T${esperado.trimestre} (esperado desde ${esperado.fechaEsperada}); ` +
      `el último guardado es ${ultimo.anio}-T${ultimo.trimestre}. Revisa las notas del CGPJ y ejecuta la ingesta.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
