import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InformeViolencia } from "./tipos";

export function claveViolencia(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export async function leerInformesViolencia(dataBaseDir: string): Promise<InformeViolencia[]> {
  const directorio = path.join(dataBaseDir, "violencia");
  let ficheros: string[];
  try {
    ficheros = await readdir(directorio);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const informes: InformeViolencia[] = [];
  for (const fichero of ficheros.filter((nombre) => /^\d{4}-T[1-4]\.json$/.test(nombre))) {
    informes.push(
      JSON.parse(await readFile(path.join(directorio, fichero), "utf8")) as InformeViolencia,
    );
  }
  return informes.sort((a, b) => a.anio * 4 + a.trimestre - (b.anio * 4 + b.trimestre));
}

export async function leerInformeViolencia(
  dataBaseDir: string,
  anio: number,
  trimestre: number,
): Promise<InformeViolencia | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "violencia", `${claveViolencia(anio, trimestre)}.json`),
      "utf8",
    );
    return JSON.parse(contenido) as InformeViolencia;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirInformeViolencia(
  dataBaseDir: string,
  informe: InformeViolencia,
): Promise<string> {
  const directorio = path.join(dataBaseDir, "violencia");
  await mkdir(directorio, { recursive: true });
  const ruta = path.join(directorio, `${claveViolencia(informe.anio, informe.trimestre)}.json`);
  await writeFile(ruta, `${JSON.stringify(informe, null, 2)}\n`, "utf8");
  return ruta;
}
