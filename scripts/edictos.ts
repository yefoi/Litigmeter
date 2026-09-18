import path from "node:path";
import { clasificarEdicto } from "../lib/edictos/classify";
import { escribirEvidencias, leerEvidencias } from "../lib/edictos/evidencias";
import { provinciaDeOrgano } from "../lib/edictos/provincias";
import { seleccionarRepresentativos } from "../lib/edictos/seleccionar";
import { buscarEdictos, leerDocumentoTeju, type EdictoTeju } from "../lib/edictos/teju";
import type { EdictoClasificado, EvidenciaEdicto } from "../lib/edictos/tipos";

const PAUSA_MS = 400;
const USER_AGENT = "litigmeter/0.1 (evidencia de edictos TEJU)";

function cargarEnvLocal(): void {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // Sin .env local: se usan las variables del entorno tal cual.
  }
}

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

function pausa(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function fechaIso(diasAtras: number): string {
  return new Date(Date.now() - diasAtras * 86_400_000).toISOString().slice(0, 10);
}

function trimestreDe(fecha: string): { anio: number; trimestre: number } {
  const [anio, mes] = fecha.split("-").map(Number);
  return { anio, trimestre: Math.floor((mes - 1) / 3) + 1 };
}

async function descargarTexto(url: string): Promise<string> {
  const respuesta = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al descargar ${url}`);
  return respuesta.text();
}

async function main(): Promise<void> {
  cargarEnvLocal();
  if (!process.env.TYPESAFE_AI_API_KEY?.trim()) {
    throw new Error("Define TYPESAFE_AI_API_KEY para clasificar los edictos");
  }

  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const edictosDir = path.join(dataBase, "edictos");
  const porCcaa = Number(opcion("por-ccaa") ?? 3);
  const maxPaginas = Number(opcion("max-paginas") ?? 2);
  const desde = opcion("desde") ?? fechaIso(7);
  const hasta = opcion("hasta") ?? fechaIso(0);

  let url = opcion("url");
  const edictos: EdictoTeju[] = [];
  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    const resultado = url
      ? await buscarEdictos({ url })
      : await buscarEdictos({ desde, hasta });
    console.log(`Página ${pagina + 1}: ${resultado.edictos.length} edictos`);
    edictos.push(...resultado.edictos);
    if (!resultado.siguiente) break;
    url = resultado.siguiente;
    await pausa(PAUSA_MS);
  }

  const porComunidad = new Map<string, EdictoTeju[]>();
  for (const edicto of edictos) {
    const provincia = provinciaDeOrgano(edicto.organo);
    edicto.provincia = provincia?.provincia ?? edicto.provincia;
    edicto.comunidad_autonoma = provincia?.comunidad_autonoma;
    if (!edicto.comunidad_autonoma) continue;
    const lista = porComunidad.get(edicto.comunidad_autonoma) ?? [];
    if (lista.length >= porCcaa) continue;
    lista.push(edicto);
    porComunidad.set(edicto.comunidad_autonoma, lista);
  }
  console.log(`Comunidades con muestra: ${porComunidad.size}`);

  const porTrimestre = new Map<string, Record<string, EvidenciaEdicto[]>>();
  for (const [comunidad, lista] of porComunidad) {
    const clasificados: EdictoClasificado[] = [];
    for (const edicto of lista) {
      try {
        const documento = leerDocumentoTeju(await descargarTexto(edicto.url));
        const entrada = {
          organo_judicial: edicto.organo,
          comunidad_autonoma: comunidad,
          fecha_publicacion: edicto.fecha_publicacion,
          texto: documento.textoClasificable,
        };
        const clasificacion = await clasificarEdicto(entrada);
        clasificados.push({ edicto: entrada, clasificacion });
        console.log(
          `  [ok] ${comunidad} ${edicto.referencia}: ${clasificacion.tipo_procedimiento} ` +
            `(relevancia ${clasificacion.relevancia_editorial.toFixed(2)})`,
        );
      } catch (error) {
        console.error(
          `  [error] ${edicto.referencia}: ${error instanceof Error ? error.message : error}`,
        );
      }
      await pausa(PAUSA_MS);
    }

    const representativos = seleccionarRepresentativos(clasificados, 3);
    if (representativos.length === 0) continue;
    const { anio, trimestre } = trimestreDe(lista[0].fecha_publicacion);
    const clave = `${anio}-T${trimestre}`;
    const acumulado = porTrimestre.get(clave) ?? {};
    acumulado[comunidad] = representativos;
    porTrimestre.set(clave, acumulado);
  }

  for (const [clave, comunidades] of porTrimestre) {
    const [anioTexto, trimestreTexto] = clave.split("-T");
    const anio = Number(anioTexto);
    const trimestre = Number(trimestreTexto);
    const existente = await leerEvidencias(edictosDir, anio, trimestre);
    const fusion: Record<string, EvidenciaEdicto[]> = { ...(existente?.comunidades ?? {}) };
    for (const [comunidad, evidencias] of Object.entries(comunidades)) {
      const combinadas = [...(fusion[comunidad] ?? []), ...evidencias]
        .filter(
          (evidencia, indice, lista) =>
            lista.findIndex(
              (candidata) =>
                candidata.tipo_procedimiento === evidencia.tipo_procedimiento &&
                candidata.resumen === evidencia.resumen,
            ) === indice,
        )
        .slice(0, 3);
      fusion[comunidad] = combinadas;
    }
    const destino = await escribirEvidencias(edictosDir, {
      version_esquema: 1,
      anio,
      trimestre,
      comunidades: fusion,
    });
    console.log(`Evidencia ${clave}: ${Object.keys(fusion).length} comunidades → ${destino}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
