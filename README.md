# Litigmeter

Seguimiento trimestral de la tasa de litigiosidad por comunidad autónoma a partir de las
notas de prensa del CGPJ, con tendencia, gravedad y noticiabilidad clasificadas por
[jev](https://docs.typesafe.ai/) (TypeSafe AI) a través del AI SDK.

- **Ingesta**: descubre la última nota trimestral nacional, extrae la tasa nacional y las 17
  autonómicas con cheerio y guarda un JSON versionado en `data/litigiosidad/AAAA-Tn.json`.
- **Enriquecimiento**: compara con el trimestre anterior, el mismo trimestre del año anterior
  y su propia serie histórica usando los informes ya guardados.
- **Clasificación**: una llamada a `experimental_evaluate` por CCAA y trimestre (~68 al año).
- **Visualización**: web Next.js prerenderizada con línea de tendencia (Recharts), mapa de
  calor por CCAA y tabla del último informe.

## Puesta en marcha

Requisitos: Node.js 22 o superior y npm.

```bash
npm install
npm run dev            # web en http://localhost:3000
npm run ingest         # descarga y guarda la última nota trimestral
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
| `es_noticiable` | `boolean` | `probability` = P(true); el umbral 0.6 es ajustable |

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
Al lanzarlo a mano desde la pestaña Actions puedes marcar la casilla `todas` para clasificar
también todo el histórico descubierto (`--todas --force`).

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
> desde la publicación y no tiene API de datos abiertos, así que el scraper queda pendiente.
> De momento la evidencia se aporta a mano o se genera con `clasificarEdicto` +
> `seleccionarRepresentativos` + `escribirEvidencias`.

## Verificación

```bash
npm test          # parser (3 plantillas reales) y enriquecimiento
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
