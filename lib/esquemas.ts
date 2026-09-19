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
  origen: z.enum(["nota_prensa", "indicadores", "serie_historica"]).optional(),
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

export const serieProvinciasSchema = z.object({
  version_esquema: z.literal(1),
  fuente: z.object({ url: z.string().min(1), titulo: z.string() }),
  anios: z.array(z.number().int()).min(1),
  nacional: z.array(z.number().nullable()),
  provincias: z.array(
    z.object({
      provincia: z.string(),
      comunidad_autonoma: z.string().optional(),
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

export const violenciaSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  generado_en: z.string(),
  origen: z.literal("nota_prensa"),
  fuente: z.object({
    url: z.string().min(1),
    titulo: z.string(),
    fecha_publicacion: z.string().optional(),
    pdf_url: z.string().optional(),
  }),
  nacional: z.object({
    denuncias: z.number(),
    denuncias_variacion_interanual_pct: z.number().optional(),
    mujeres_denunciantes: z.number().optional(),
    mujeres_variacion_interanual_pct: z.number().optional(),
    tasa_victimas_por_10000: z.number(),
    tasa_delta_puntos: z.number().optional(),
    renuncias: z.number().optional(),
    renuncias_pct: z.number().optional(),
    renuncias_variacion_interanual_pct: z.number().optional(),
    ordenes_solicitadas: z.number().optional(),
    ordenes_solicitadas_variacion_pct: z.number().optional(),
    ordenes_acordadas: z.number().optional(),
    ordenes_acordadas_variacion_pct: z.number().optional(),
    sentencias: z.number().optional(),
    sentencias_condenatorias_pct: z.number().optional(),
    violencia_sexual_denuncias: z.number().optional(),
    violencia_sexual_ordenes_solicitadas: z.number().optional(),
    violencia_sexual_ordenes_acordadas: z.number().optional(),
  }),
  comunidades: z.array(
    z.object({
      comunidad_autonoma: z.string(),
      tasa_victimas_por_10000: z.number(),
    }),
  ),
});

export const crisisSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  generado_en: z.string(),
  origen: z.literal("nota_prensa"),
  fuente: z.object({
    url: z.string().min(1),
    titulo: z.string(),
    fecha_publicacion: z.string().optional(),
    pdf_url: z.string().optional(),
  }),
  nacional: z.object({
    lanzamientos: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
      lau: z.number(),
      lau_pct_del_total: z.number().optional(),
      lau_variacion_interanual_pct: z.number().optional(),
      hipotecarios_pct_del_total: z.number().optional(),
      hipotecarios_variacion_interanual_pct: z.number().optional(),
      otras: z.number().optional(),
      otras_variacion_interanual_pct: z.number().optional(),
      solicitados: z.number().optional(),
      solicitados_variacion_interanual_pct: z.number().optional(),
      solicitados_cumplimiento_positivo: z.number().optional(),
      solicitados_cumplimiento_variacion_pct: z.number().optional(),
    }),
    ejecuciones_hipotecarias: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
    }),
    concursos: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
      personas_juridicas: z.number().optional(),
      personas_juridicas_variacion_interanual_pct: z.number().optional(),
      naturales_empresarios: z.number().optional(),
      naturales_empresarios_variacion_interanual_pct: z.number().optional(),
      naturales_no_empresarios: z.number().optional(),
      naturales_no_empresarios_variacion_interanual_pct: z.number().optional(),
      declarados: z.number().optional(),
      declarados_variacion_interanual_pct: z.number().optional(),
      fase_convenio: z.number().optional(),
      fase_convenio_variacion_pct: z.number().optional(),
      fase_liquidacion: z.number().optional(),
      fase_liquidacion_variacion_pct: z.number().optional(),
      ere_art169: z.number().optional(),
      ere_art169_variacion_pct: z.number().optional(),
    }),
    despidos: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
    }),
    reclamaciones_cantidad: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
    }),
    monitorios: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
    }),
    ocupacion_ilegal: z.object({
      total: z.number(),
      variacion_interanual_pct: z.number().optional(),
    }),
  }),
  rankings: z.array(
    z.object({
      indicador: z.enum([
        "lanzamientos",
        "lanzamientos_lau",
        "lanzamientos_hipotecarios",
        "ejecuciones_hipotecarias",
        "concursos",
        "concursos_personas_juridicas",
        "concursos_naturales_empresarios",
        "concursos_naturales_no_empresarios",
        "despidos",
        "reclamaciones_cantidad",
        "monitorios",
        "ocupacion_ilegal",
      ]),
      comunidad_autonoma: z.string(),
      valor: z.number(),
    }),
  ),
});

const datoDivorcioSchema = z.object({
  total: z.number(),
  variacion_interanual_pct: z.number().optional(),
});

export const divorciosSchema = z.object({
  version_esquema: z.literal(1),
  anio: z.number().int(),
  trimestre: z.number().int().min(1).max(4),
  generado_en: z.string(),
  origen: z.literal("nota_prensa"),
  fuente: z.object({
    url: z.string().min(1),
    titulo: z.string(),
    fecha_publicacion: z.string().optional(),
    pdf_url: z.string().optional(),
  }),
  nacional: z.object({
    total: z.number(),
    variacion_interanual_pct: z.number().optional(),
    tasa_media_por_100000: z.number().optional(),
    divorcios_consensuados: datoDivorcioSchema.optional(),
    divorcios_no_consensuados: datoDivorcioSchema.optional(),
    separaciones_consensuadas: datoDivorcioSchema.optional(),
    separaciones_no_consensuadas: datoDivorcioSchema.optional(),
    nulidades: datoDivorcioSchema.optional(),
    modificacion_medidas_consensuadas: datoDivorcioSchema.optional(),
    modificacion_medidas_no_consensuadas: datoDivorcioSchema.optional(),
    guarda_custodia_consensuadas: datoDivorcioSchema.optional(),
    guarda_custodia_no_consensuadas: datoDivorcioSchema.optional(),
  }),
  comunidades: z.array(
    z.object({
      comunidad_autonoma: z.string(),
      tasa_por_100000: z.number(),
    }),
  ),
});

const medidasOrdenSchema = z.object({
  ingresados: z.array(z.number().nullable()),
  resueltos: z.array(z.number().nullable()),
  en_tramite: z.array(z.number().nullable()),
});

export const ordenesAnualSchema = z.object({
  version_esquema: z.literal(1),
  fuente: z.object({ url: z.string().min(1), titulo: z.string() }),
  anios: z.array(z.number().int()).min(1),
  ordenes: z
    .array(
      z.object({
        orden: z.enum(["civil", "penal", "contencioso", "social"]),
        nacional: medidasOrdenSchema,
        comunidades: z.array(
          medidasOrdenSchema.extend({ comunidad_autonoma: z.string().min(1) }),
        ),
      }),
    )
    .length(4),
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
  for (const fichero of await ficherosJson(path.join(dataBaseDir, "violencia"))) {
    await comprobar(path.join(dataBaseDir, "violencia", fichero), violenciaSchema);
  }
  for (const fichero of await ficherosJson(path.join(dataBaseDir, "crisis"))) {
    await comprobar(path.join(dataBaseDir, "crisis", fichero), crisisSchema);
  }
  for (const fichero of await ficherosJson(path.join(dataBaseDir, "divorcios"))) {
    await comprobar(path.join(dataBaseDir, "divorcios", fichero), divorciosSchema);
  }
  const anual = path.join(dataBaseDir, "anual", "litigiosidad-anual.json");
  if (existsSync(anual)) await comprobar(anual, serieAnualSchema);
  const provincias = path.join(dataBaseDir, "anual", "litigiosidad-provincias.json");
  if (existsSync(provincias)) await comprobar(provincias, serieProvinciasSchema);
  const ordenes = path.join(dataBaseDir, "ordenes", "ordenes-anual.json");
  if (existsSync(ordenes)) await comprobar(ordenes, ordenesAnualSchema);
  const reconciliacion = path.join(dataBaseDir, "reconciliacion.json");
  if (existsSync(reconciliacion)) await comprobar(reconciliacion, reconciliacionSchema);
  const previsiones = path.join(dataBaseDir, "previsiones.json");
  if (existsSync(previsiones)) await comprobar(previsiones, previsionesSchema);
  const alertas = path.join(dataBaseDir, "alertas.json");
  if (existsSync(alertas)) await comprobar(alertas, alertasSchema);

  return errores;
}
