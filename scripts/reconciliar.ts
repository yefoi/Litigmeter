import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FicheroIndicadores } from "../lib/indicadores/tipos";
import { leerInformes } from "../lib/litigiosidad/historico";
import { reconciliar } from "../lib/reconciliacion";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const sinEscribir = process.argv.includes("--sin-escribir");

  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  const directorioIndicadores = path.join(dataBase, "indicadores");
  let ficheros: string[] = [];
  try {
    ficheros = (await readdir(directorioIndicadores)).filter((fichero) =>
      fichero.endsWith(".json"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const indicadores: FicheroIndicadores[] = [];
  for (const fichero of ficheros) {
    indicadores.push(
      JSON.parse(await readFile(path.join(directorioIndicadores, fichero), "utf8")) as FicheroIndicadores,
    );
  }

  const informe = reconciliar(informes, indicadores);
  console.log(
    `Contraste nota vs indicadores: ${informe.discrepancias.length} discrepancias ` +
      `(${informe.fuentes.informes} informes, ${informe.fuentes.indicadores} ficheros de indicadores).`,
  );
  for (const discrepancia of informe.discrepancias.slice(0, 25)) {
    console.log(
      `  ${discrepancia.anio}-T${discrepancia.trimestre} ${discrepancia.ambito} ` +
        `${discrepancia.variable}: nota ${discrepancia.valor_nota} vs indicadores ` +
        `${discrepancia.valor_indicadores} (${discrepancia.relativa_pct > 0 ? "+" : ""}` +
        `${discrepancia.relativa_pct} %) [${discrepancia.fuente_indicadores}]`,
    );
  }
  if (informe.discrepancias.length > 25) {
    console.log(`  … y ${informe.discrepancias.length - 25} más`);
  }

  if (!sinEscribir) {
    const destino = path.join(dataBase, "reconciliacion.json");
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, `${JSON.stringify(informe, null, 2)}\n`, "utf8");
    console.log(`Informe escrito en ${destino}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
