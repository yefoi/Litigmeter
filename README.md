# Litigmeter

Seguimiento trimestral de la tasa de litigiosidad por comunidad autónoma a partir de las
notas de prensa del CGPJ, con tendencia, gravedad y noticiabilidad clasificadas por
[jev](https://docs.typesafe.ai/) (TypeSafe AI) a través del AI SDK.

- **Ingesta**: descubre la última nota trimestral nacional, extrae la tasa nacional y las 17
  autonómicas con cheerio y guarda un JSON versionado en `data/litigiosidad/AAAA-Tn.json`.
- **Enriquecimiento**: compara con el trimestre anterior, el mismo trimestre del año anterior
  y su propia serie histórica usando los informes ya guardados.
- **Clasificación**: una llamada a `experimental_evaluate` por CCAA y trimestre (~68 al año).
- **Visualización**: web Next.js prerenderizada con línea de tendencia (Recharts) y
  comparador de dos series, mapa de calor por CCAA, tabla del último informe, una página por
  comunidad (`/ccaa/[slug]`, con OpenGraph propio), feed RSS (`/feed.xml`) y resumen
  editorial generado a partir de las clasificaciones de jev.

## Puesta en marcha

Requisitos: Node.js 22 o superior y npm.

```bash
npm install
npm run dev            # web en http://localhost:3000
npm run ingest         # descarga y guarda la última nota trimestral
npm run backfill-anual # series anuales 2001-2025 del CGPJ (data/anual)
npm run indicadores    # congestión, pendencia y resolución por TSJ (data/indicadores)
npm run editorial      # resumen editorial del último trimestre (data/editorial)
npm run edictos        # evidencia real de edictos TEJU (data/edictos, requiere API key)
npm run calibrar       # distribución de probabilidades + CSV para etiquetar
npm run validar        # valida todos los JSON de data/ con Zod
npm run watchdog       # comprueba que el informe trimestral esperado está publicado
```

Opciones de ingesta:

```bash
npm run ingest -- --todas              # backfill: todas las notas del feed, en orden
npm run ingest -- --url=https://...    # una nota concreta
npm run ingest -- --sin-clasificar     # solo datos, sin llamar a jev
npm run ingest -- --force              # reescribe el JSON aunque ya exista
npm run ingest -- --reclasificar       # vuelve a clasificar (p. ej. tras añadir evidencia)
```

## Clasificación con jev

Copia `.env.example` a `.env` y define la clave:

```bash
TYPESAFE_AI_API_KEY=...
```

Sin clave, la ingesta guarda los datos con `clasificacion` vacía; cuando la definas,
vuelve a ejecutar la ingesta y se rellenan solo las clasificaciones que falten.

El esquema de preguntas vive en `lib/litigiosidad/classify.ts`:

| Pregunta | Primitivo | Respuesta |
| --- | --- | --- |
| `tendencia` | `choice` | `mejora` / `estable` / `empeora` |
| `gravedad_congestion` | `score` | posición fraccionaria 0–4 (la UI la muestra como 1–5) |
| `es_noticiable` | `boolean` | `probability` = P(true); umbral configurable con `UMBRAL_NOTICIABLE` (0.75 por defecto) |

`npm run calibrar` imprime cuántas CCAA quedarían noticiables con cada umbral y deja
`data/calibracion/noticiabilidad.csv` con una columna `etiqueta_humana` para etiquetar a
mano y elegir el umbral con datos. La confianza de jev (tendencia y gravedad) se muestra en
las tablas y se resalta cuando baja del 50 %.

Detalles del provider que conviene tener presentes:

- `experimental_evaluate` requiere AI SDK ≥ 7.0.105 y el provider exige Node ≥ 22.
- `boolean` es el nombre del primitivo Noul en el AI SDK; usa `probability`, no `confidence`.
- La confianza de Choice/Score (estadístico de TypeSafe) está en
  `result.providerMetadata.typesafe.confidence[questionId]` y se guarda como `confianza_*`.
- `score` está indexado desde 0: cinco niveles devuelven 0–4, no 1–5.

## Automatización

`.github/workflows/ingest.yml` ejecuta la ingesta **todos los lunes a las 06:00 UTC** y
commitea `data/` si hay cambios. Para que clasifique, añade el secreto
`TYPESAFE_AI_API_KEY` en el repositorio de GitHub (es opcional: sin él solo recopila datos).
Tras la ingesta ejecuta `npm run indicadores` (congestión, pendencia y resolución),
`npm run editorial` (resumen del trimestre) y `npm run validar` (esquemas Zod).
Al lanzarlo a mano desde la pestaña Actions puedes marcar `todas` (clasificar todo el
histórico descubierto) y `reclasificar` (volver a clasificar con los indicadores nuevos).

`.github/workflows/watchdog.yml` comprueba cada lunes si el informe trimestral esperado ya
está publicado y abre un issue si falta, para que un retraso del CGPJ no pase inadvertido.

No se usa Vercel Cron a propósito: el filesystem de Vercel es de solo lectura, así que un
cron allí no puede persistir el JSON en el repositorio. Con la Action, el commit dispara el
despliegue en Vercel y la web se regenera con los datos nuevos.

Deploy en Vercel: importa el repositorio tal cual. Los datos se leen en el build
(`data/litigiosidad`), por lo que la página se prerenderiza y no necesita variables de
entorno en producción.

## Datos

Cada `InformeTrimestral` incluye `fuente` (URL de la nota, fecha y PDF), `resumen_nota`
(párrafos de contexto para jev), `nacional` y `comunidades` con tasa, posición, variaciones
y `clasificacion`.

- `tasa_litigiosidad_trimestre_anterior` y `variacion_interanual_pct` se derivan de los JSON
  guardados: si aún no hay histórico, quedan vacíos.
- `data/anual/litigiosidad-anual.json` guarda la serie anual 2001–2025 por TSJ del CGPJ
  (`npm run backfill-anual`). La ingesta añade `serie_anual` (últimos 10 años) al `state` de
  jev como contexto histórico.
- `data/indicadores/AAAA-Tn.json` guarda congestión, pendencia y resolución reales por CCAA,
  con el mismo periodo del año anterior y el nacional (`npm run indicadores`, idempotente).
  Cuando existen, la ingesta los pasa a jev y `gravedad_congestion` deja de usar la
  litigiosidad como proxy; para aplicarlos a un trimestre ya clasificado:
  `npm run ingest -- --reclasificar` (o el input `reclasificar` del workflow).
- `data/editorial/AAAA-Tn.json` guarda el resumen editorial: jev elige el foco entre los
  candidatos que ordena el código (noticiables, gravedad) y el texto se compone con
  plantillas, sin generación libre.

## Índice Litigmeter

Indicador propio de presión judicial (0–100) por CCAA y trimestre: pondera nivel de
litigiosidad (40 %), tendencia interanual (25 %), congestión (20 %) y pendencia (15 %). Si
falta un componente —porque el CGPJ no publica ese indicador ese trimestre— los pesos se
renormalizan entre los disponibles. Es una métrica editorial del proyecto, no un dato
oficial; la metodología vive en `lib/litigiosidad/indice.ts` y se muestra (junto a los
criterios y la evidencia de cada clasificación) en la ficha "Cómo lo clasifica jev" de cada
comunidad.

## Previsión y aciertos

`npm run prevision` genera `data/previsiones.json`: una previsión transparente para el
trimestre siguiente (estacional simple —mismo trimestre del año anterior— con deriva
amortiguada) y un marcador que compara cada previsión con el dato real cuando el CGPJ lo
publica (error medio absoluto y comunidades dentro del ±5 %). El paso va en el workflow, así
que el marcador se actualiza solo con cada ingesta.

## Alertas y RSS

`npm run alertas` genera `data/alertas.json` con los eventos del último trimestre: casos
marcados como noticiables, cambios de tendencia, saltos interanuales, extremos de la serie y
diferenciales frente a la media nacional, con severidad alta/media/baja. Se muestran en la
portada y, si defines `RESEND_API_KEY`, `ALERTAS_DESTINO` y `ALERTAS_REMITENTE`, el script
envía un email solo con las alertas altas nuevas (sin repetir en cada ejecución).

Además, cada comunidad tiene su propio RSS en `/ccaa/<slug>/feed.xml`, enlazado desde su
página, para seguirla por separado.
- Hay huecos tal y como los publicó el CGPJ: 2025-T1 no trae la tasa de País Vasco y 2025-T2
  no trae la de La Rioja. Se registran en `comunidades_ausentes` al parsear y se muestran
  como celdas vacías.

### Edictos como evidencia (opcional)

`lib/edictos/` clasifica edictos judiciales individuales (TEJU) y destila hasta tres casos
representativos por CCAA para sustentar la clasificación trimestral:

- `clasificarEdicto(edicto)` — tipo de procedimiento (choice), relevancia editorial (score
  0–4) y `es_representativo` (boolean).
- `seleccionarRepresentativos(edictos, limite)` — ordena por relevancia, no repite tipo de
  procedimiento y devuelve solo `{ tipo_procedimiento, resumen }`, con DNI/NIE/CIF/IBAN y
  nombres redactados.

La ingesta lee `data/edictos/AAAA-Tn.json` si existe y añade `edictos_representativos` al
`state` de `clasificarTrimestre`. El texto íntegro de un edicto no se guarda ni se envía:
jev recibe el texto redactado y el dashboard no muestra edictos.

> El TEJU (`boe.es/buscar/edictos_judiciales.php`) solo es de acceso libre durante 4 meses
> desde la publicación y no tiene API de datos abiertos. `npm run edictos` muestrea los
> resultados por fechas (hasta `--por-ccaa` edictos por comunidad, con `--desde`, `--hasta`
> y `--max-paginas`), mapea la provincia del órgano a su CCAA (`lib/edictos/provincias.ts`)
> y clasifica solo las secciones seguras del documento: órgano, procedimiento, resolución y
> objeto. La sección de destinatarios nunca entra en el texto clasificable.
> El paso está en el workflow con `continue-on-error` para que un fallo del TEJU no tumbe
> la ingesta.

## Verificación

```bash
npm test          # 40+ tests: parser, enriquecimiento, series, indicadores, edictos, editorial, watchdog y datos
npm run typecheck
npm run lint
npm run build
```

## Roadmap

- Backfill completo 2001–2025 con las series históricas del CGPJ
  (`Series Tasa de Litigiosidad por TSJ 2001-2025.xlsx`) o PC-AXIS (`.px`) desde 1995.
- Añadir congestión, pendencia y resolución por orden jurisdiccional.
- Calibrar los umbrales de `es_noticiable` y la gravedad con casos etiquetados.

## Atribución

Datos públicos del Consejo General del Poder Judicial. La ingesta consulta sus páginas una
vez por semana; este proyecto no está afiliado al CGPJ.
