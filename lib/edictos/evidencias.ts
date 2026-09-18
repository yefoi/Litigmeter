import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FicheroEvidencias } from "./tipos";

export function claveEvidencias(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export async function leerEvidencias(
  edictosDir: string,
  anio: number,
  trimestre: number,
): Promise<FicheroEvidencias | undefined> {
  try {
    const contenido = await readFile(
      path.join(edictosDir, `${claveEvidencias(anio, trimestre)}.json`),
      "utf8",
    );
    const fichero = JSON.parse(contenido) as FicheroEvidencias;
    if (fichero.version_esquema !== 1 || typeof fichero.comunidades !== "object") {
      throw new Error("Formato de evidencias de edictos no válido");
    }
    return fichero;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirEvidencias(
  edictosDir: string,
  fichero: FicheroEvidencias,
): Promise<string> {
  await mkdir(edictosDir, { recursive: true });
  const ruta = path.join(edictosDir, `${claveEvidencias(fichero.anio, fichero.trimestre)}.json`);
  await writeFile(ruta, `${JSON.stringify(fichero, null, 2)}\n`, "utf8");
  return ruta;
}
