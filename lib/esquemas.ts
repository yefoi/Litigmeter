import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const clasificacionSchema = z.object({
  tendencia: z.enum(["mejora", "estable", "empeora"]),
  gravedad_congestion: z.number().min(0).max(4),
  es_noticiable: z.boolean(),
  probabilidad_noticiable: z.number().min(0).max(1),
  confianza_tendencia: z.number().min(0).max(1).optional(),
  confianza_gravedad: z.number().min(0).max(1).optional(),
  modelo: z.string(),
});

const registroSchema = z.object({
  comunidad_autonoma: z.string().min(1),
  tasa_litigiosidad: z.number(),
  tasa_litigiosidad_trimestre_anterior: z.number().optional(),
  variacion_trimestral_pct: z.number().optional(),
  variacion_interanual_pct: z.number().optional(),
  diferencial_vs_nacional: z.number().optional(),
  posicion_nacional: z.number().int().positive(),
  clasificacion: clasificacionSchema.optional(),
  error_clasificacion: z.string().optional(),
});

export const informeSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int().min(2001),
  trimestre: z.number().int().min(1).max(4),
  generado_en: z.string(),
  fuente: z.object({
    url: z.string().min(1),
    titulo: z.string(),
    fecha_publicacion: z.string().optional(),
    pdf_url: z.string().optional(),
  }),
  resumen_nota: z.string(),
  nacional: z.object({
    tasa_litigiosidad: z.number(),
    tasa_litigiosidad_anio_anterior: z.number().optional(),
    variacion_interanual_pct: z.number().optional(),
  }),
  comunidades: z.array(registroSchema).min(1),
});

export const serieAnualSchema = z.object({
  version_esquema: z.literal(1),
  fuente: z.object({ url: z.string().min(1), titulo: z.string() }),
  anios: z.array(z.number().int()).min(1),
  nacional: z.array(z.number().nullable()),
  comunidades: z.array(
    z.object({
      comunidad_autonoma: z.string(),
      valores: z.array(z.number().nullable()),
    }),
  ),
});

const tasasIndicadoresSchema = z.object({
  resolucion: z.number().optional(),
  resolucion_anio_anterior: z.number().optional(),
  pendencia: z.number().optional(),
  pendencia_anio_anterior: z.number().optional(),
  congestion: z.number().optional(),
  congestion_anio_anterior: z.number().optional(),
  litigiosidad: z.number().optional(),
  litigiosidad_anio_anterior: z.number().optional(),
});

export const indicadoresSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  fuente: z.object({ url: z.string().min(1), titulo: z.string() }),
  nacional: tasasIndicadoresSchema.optional(),
  comunidades: z.record(z.string(), tasasIndicadoresSchema),
});

export const evidenciasSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  comunidades: z.record(
    z.string(),
    z.array(
      z.object({
        tipo_procedimiento: z.enum([
          "civil",
          "penal",
          "social",
          "mercantil",
          "contencioso_administrativo",
          "otro",
        ]),
        resumen: z.string(),
      }),
    ),
  ),
});

const destacadoEditorialSchema = z.object({
  comunidad_autonoma: z.string(),
  tendencia: z.string(),
  gravedad: z.string(),
  detalle: z.string(),
  evidencia: z.string().optional(),
});

export const editorialSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  generado_en: z.string(),
  titular: z.string().min(1),
  entradilla: z.string().min(1),
  foco: destacadoEditorialSchema.optional(),
  destacados: z.array(destacadoEditorialSchema),
  fuente: z.object({ url: z.string().min(1), titulo: z.string() }),
});

export const reconciliacionSchema = z.object({
  version_esquema: z.literal(1),
  generado_en: z.string(),
  discrepancias: z.array(
    z.object({
      ambito: z.string(),
      anio: z.number().int(),
      trimestre: z.number().int().min(1).max(4),
      variable: z.string(),
      valor_nota: z.number(),
      valor_indicadores: z.number(),
      diferencia: z.number(),
      relativa_pct: z.number(),
      fuente_indicadores: z.string(),
    }),
  ),
  fuentes: z.object({ informes: z.number(), indicadores: z.number() }),
});

export const alertasSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  generado_en: z.string(),
  alertas: z.array(
    z.object({
      comunidad_autonoma: z.string(),
      tipo: z.enum([
        "noticiable",
        "cambio_tendencia",
        "salto_interanual",
        "extremo_serie",
        "diferencial_nacional",
      ]),
      severidad: z.enum(["alta", "media", "baja"]),
      detalle: z.string(),
    }),
  ),
});

export const previsionesSchema = z.object({
  version_esquema: z.literal(1),
  generado_en: z.string(),
  previsiones: z.array(
    z.object({
      anio: z.number().int(),
      trimestre: z.number().int().min(1).max(4),
      generado_desde: z.string(),
      comunidades: z.record(z.string(), z.object({ tasa: z.number(), metodo: z.string() })),
      nacional: z.object({ tasa: z.number(), metodo: z.string() }),
    }),
  ),
  aciertos: z.array(
    z.object({
      anio: z.number().int(),
      trimestre: z.number().int().min(1).max(4),
      comunidades: z.record(
        z.string(),
        z.object({
          previsto: z.number(),
          real: z.number(),
          error: z.number(),
          error_pct: z.number(),
        }),
      ),
      error_medio: z.number(),
      dentro_5pct: z.number(),
      total: z.number(),
    }),
  ),
});

export interface ErrorValidacion {
  ruta: string;
  error: string;
}

async function ficherosJson(directorio: string): Promise<string[]> {
  try {
    return (await readdir(directorio)).filter((fichero) => fichero.endsWith(".json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function validarDatos(dataBaseDir: string): Promise<ErrorValidacion[]> {
  const errores: ErrorValidacion[] = [];

  const comprobar = async (ruta: string, esquema: z.ZodType) => {
    try {
      const contenido = JSON.parse(await readFile(ruta, "utf8")) as unknown;
      const resultado = esquema.safeParse(contenido);
      if (!resultado.success) {
        const detalle = resultado.error.issues
          .map((issue) => `${issue.path.join(".") || "(raíz)"}: ${issue.message}`)
          .join("; ");
        errores.push({ ruta: path.relative(dataBaseDir, ruta), error: detalle });
      }
    } catch (error) {
      errores.push({
        ruta: path.relative(dataBaseDir, ruta),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  for (const fichero of await ficherosJson(path.join(dataBaseDir, "litigiosidad"))) {
    await comprobar(path.join(dataBaseDir, "litigiosidad", fichero), informeSchema);
  }
  for (const fichero of await ficherosJson(path.join(dataBaseDir, "indicadores"))) {
    await comprobar(path.join(dataBaseDir, "indicadores", fichero), indicadoresSchema);
  }
  for (const fichero of await ficherosJson(path.join(dataBaseDir, "edictos"))) {
    await comprobar(path.join(dataBaseDir, "edictos", fichero), evidenciasSchema);
  }
  for (const fichero of await ficherosJson(path.join(dataBaseDir, "editorial"))) {
    await comprobar(path.join(dataBaseDir, "editorial", fichero), editorialSchema);
  }
  const anual = path.join(dataBaseDir, "anual", "litigiosidad-anual.json");
  if (existsSync(anual)) await comprobar(anual, serieAnualSchema);
  const reconciliacion = path.join(dataBaseDir, "reconciliacion.json");
  if (existsSync(reconciliacion)) await comprobar(reconciliacion, reconciliacionSchema);
  const previsiones = path.join(dataBaseDir, "previsiones.json");
  if (existsSync(previsiones)) await comprobar(previsiones, previsionesSchema);
  const alertas = path.join(dataBaseDir, "alertas.json");
  if (existsSync(alertas)) await comprobar(alertas, alertasSchema);

  return errores;
}
