import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FicheroIndicadores } from "./tipos";

export function claveIndicadores(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export async function leerIndicadores(
  dataBaseDir: string,
  anio: number,
  trimestre: number,
): Promise<FicheroIndicadores | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "indicadores", `${claveIndicadores(anio, trimestre)}.json`),
      "utf8",
    );
    const fichero = JSON.parse(contenido) as FicheroIndicadores;
    if (fichero.version_esquema !== 1 || typeof fichero.comunidades !== "object") {
      throw new Error("Formato de indicadores no válido");
    }
    return fichero;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirIndicadores(
  dataBaseDir: string,
  fichero: FicheroIndicadores,
): Promise<string> {
  const directorio = path.join(dataBaseDir, "indicadores");
  await mkdir(directorio, { recursive: true });
  const ruta = path.join(directorio, `${claveIndicadores(fichero.anio, fichero.trimestre)}.json`);
  await writeFile(ruta, `${JSON.stringify(fichero, null, 2)}\n`, "utf8");
  return ruta;
}
