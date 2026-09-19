import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InformeDivorcios } from "./tipos";

export function claveDivorcios(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export async function leerInformesDivorcios(dataBaseDir: string): Promise<InformeDivorcios[]> {
  const directorio = path.join(dataBaseDir, "divorcios");
  let ficheros: string[];
  try {
    ficheros = await readdir(directorio);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const informes: InformeDivorcios[] = [];
  for (const fichero of ficheros.filter((nombre) => /^\d{4}-T[1-4]\.json$/.test(nombre))) {
    informes.push(
      JSON.parse(await readFile(path.join(directorio, fichero), "utf8")) as InformeDivorcios,
    );
  }
  return informes.sort((a, b) => a.anio * 4 + a.trimestre - (b.anio * 4 + b.trimestre));
}

export async function leerInformeDivorcios(
  dataBaseDir: string,
  anio: number,
  trimestre: number,
): Promise<InformeDivorcios | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "divorcios", `${claveDivorcios(anio, trimestre)}.json`),
      "utf8",
    );
    return JSON.parse(contenido) as InformeDivorcios;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirInformeDivorcios(
  dataBaseDir: string,
  informe: InformeDivorcios,
): Promise<string> {
  const directorio = path.join(dataBaseDir, "divorcios");
  await mkdir(directorio, { recursive: true });
  const ruta = path.join(directorio, `${claveDivorcios(informe.anio, informe.trimestre)}.json`);
  await writeFile(ruta, `${JSON.stringify(informe, null, 2)}\n`, "utf8");
  return ruta;
}
