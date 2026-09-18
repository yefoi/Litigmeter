import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ResumenEditorial } from "./tipos";

export function claveEditorial(anio: number, trimestre: number): string {
  return `${anio}-T${trimestre}`;
}

export async function leerEditorial(
  dataBaseDir: string,
  anio: number,
  trimestre: number,
): Promise<ResumenEditorial | undefined> {
  try {
    const contenido = await readFile(
      path.join(dataBaseDir, "editorial", `${claveEditorial(anio, trimestre)}.json`),
      "utf8",
    );
    const resumen = JSON.parse(contenido) as ResumenEditorial;
    if (resumen.version_esquema !== 1 || typeof resumen.titular !== "string") {
      throw new Error("Formato de resumen editorial no válido");
    }
    return resumen;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function escribirEditorial(
  dataBaseDir: string,
  resumen: ResumenEditorial,
): Promise<string> {
  const directorio = path.join(dataBaseDir, "editorial");
  await mkdir(directorio, { recursive: true });
  const ruta = path.join(
    directorio,
    `${claveEditorial(resumen.anio, resumen.trimestre)}.json`,
  );
  await writeFile(ruta, `${JSON.stringify(resumen, null, 2)}\n`, "utf8");
  return ruta;
}
