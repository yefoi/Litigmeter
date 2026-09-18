/**
 * Preguntas que jev responde para cada CCAA y trimestre. Viven aquí para que la
 * web pueda mostrar los criterios exactos que se usaron (ficha "por qué").
 */
export const PREGUNTAS_LITIGIOSIDAD = {
  tendencia: {
    type: "choice",
    instructions:
      "Clasifica la tendencia de la carga judicial de esta comunidad autónoma " +
      "en el trimestre. Compara `tasa_litigiosidad_actual` con " +
      "`tasa_litigiosidad_trimestre_anterior` (si está disponible), con " +
      "`tasa_litigiosidad_media_nacional` y con `serie_historica` y " +
      "`serie_anual` (si están disponibles). Usa `resumen_nota_prensa` para " +
      "matizar la lectura y, si `edictos_representativos` está presente, " +
      "úsalo como evidencia cualitativa de los asuntos que se están tramitando.",
    criteria: {
      mejora:
        "La tasa baja respecto al trimestre anterior, o se sitúa claramente por " +
        "debajo de su tendencia reciente y de la media nacional.",
      estable:
        "La tasa varía menos de un 3 % respecto al trimestre anterior y se " +
        "mantiene cerca de su nivel habitual.",
      empeora:
        "La tasa sube respecto al trimestre anterior, o se aleja al alza de su " +
        "tendencia reciente, con la nota de prensa indicando más carga.",
    },
  },
  gravedad_congestion: {
    type: "score",
    instructions:
      "Evalúa la presión de carga judicial de esta comunidad autónoma. Si " +
      "`tasa_congestion`, `tasa_pendencia` o `tasa_resolucion` están disponibles, " +
      "úsalas como medida directa, comparándolas con su valor del año anterior y " +
      "con `media_nacional_congestion` y `media_nacional_pendencia` si están. Si " +
      "no, usa la tasa de litigiosidad (`tasa_litigiosidad_actual`), su distancia " +
      "a `tasa_litigiosidad_media_nacional` y `serie_historica`/`serie_anual` como " +
      "indicadores de carga.",
    criteria: [
      "Tasa claramente por debajo de la media nacional y de su serie histórica; sin presión de carga.",
      "Tasa por debajo de la media nacional, o en la parte baja de su serie histórica.",
      "Tasa en torno a la media nacional y dentro de su rango histórico habitual.",
      "Tasa por encima de la media nacional, o en la parte alta de su serie histórica.",
      "Tasa notablemente por encima de la media nacional y en máximos de su serie histórica; carga crítica.",
    ],
  },
  es_noticiable: {
    type: "boolean",
    instructions:
      "¿Este dato es lo bastante inusual como para destacarlo en un resumen " +
      "editorial? Considera un máximo o mínimo de `serie_anual` o " +
      "`serie_historica` (si están disponibles), una variación interanual " +
      "brusca (más de un 15 % en valor absoluto) o un diferencial frente a la " +
      "media nacional superior al 15 %. Si se aportan " +
      "`edictos_representativos`, valora si alguno de esos casos concretos " +
      "hace más destacable el dato. Responde sí solo si hay algo realmente " +
      "destacable.",
  },
} as const;
