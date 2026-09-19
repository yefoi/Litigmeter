import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InformeCrisis } from "./tipos";

export function claveCrisis(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export async function leerInformesCrisis(dataBaseDir: string): Promise<InformeCrisis[]> {
  const directorio = path.join(dataBaseDir, "crisis");
  let ficheros: string[];
  try {
    ficheros = await readdir(directorio);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const informes: InformeCrisis[] = [];
  for (const fichero of ficheros.filter((nombre) => /^\d{4}-T[1-4]\.json$/.test(nombre))) {
    informes.push(
      JSON.parse(await readFile(path.join(directorio, fichero), "utf8")) as InformeCrisis,
    );
  }
  return informes.sort((a, b) => a.anio * 4 + a.trimestre - (b.anio * 4 + b.trimestre));
}

export async function leerInformeCrisis(
  dataBaseDir: string,
  anio: number,
  trimestre: number,
): Promise<InformeCrisis | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "crisis", `${claveCrisis(anio, trimestre)}.json`),
      "utf8",
    );
    return JSON.parse(contenido) as InformeCrisis;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirInformeCrisis(
  dataBaseDir: string,
  informe: InformeCrisis,
): Promise<string> {
  const directorio = path.join(dataBaseDir, "crisis");
  await mkdir(directorio, { recursive: true });
  const ruta = path.join(directorio, `${claveCrisis(informe.anio, informe.trimestre)}.json`);
  await writeFile(ruta, `${JSON.stringify(informe, null, 2)}\n`, "utf8");
  return ruta;
}
