import path from "node:path";
import { contrastarAfirmacion, validarAfirmacion } from "@/lib/contraste";
import { leerInformes } from "@/lib/litigiosidad/historico";

const LIMITE_POR_IP = 10;
const VENTANA_MS = 60 * 60 * 1000;
const registros = new Map<string, number[]>();

function permitir(ip: string): boolean {
  const ahora = Date.now();
  const previos = (registros.get(ip) ?? []).filter((marca) => ahora - marca < VENTANA_MS);
  if (previos.length >= LIMITE_POR_IP) return false;
  previos.push(ahora);
  registros.set(ip, previos);
  return true;
}

export async function POST(peticion: Request): Promise<Response> {
  if (!process.env.TYPESAFE_AI_API_KEY?.trim()) {
    return Response.json(
      { error: "El contraste no está configurado en este despliegue (falta TYPESAFE_AI_API_KEY)." },
      { status: 503 },
    );
  }

  const ip =
    peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonima";
  if (!permitir(ip)) {
    return Response.json(
      { error: "Demasiadas peticiones desde esta conexión; inténtalo dentro de un rato." },
      { status: 429 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return Response.json({ error: "JSON no válido." }, { status: 400 });
  }
  const afirmacion =
    typeof (cuerpo as { afirmacion?: unknown })?.afirmacion === "string"
      ? (cuerpo as { afirmacion: string }).afirmacion
      : "";
  const error = validarAfirmacion(afirmacion);
  if (error) return Response.json({ error }, { status: 400 });

  const informes = await leerInformes(path.join(process.cwd(), "data", "litigiosidad"));
  try {
    const contraste = await contrastarAfirmacion(afirmacion, informes);
    return Response.json(contraste);
  } catch (errorContraste) {
    return Response.json(
      {
        error:
          errorContraste instanceof Error
            ? errorContraste.message
            : "Error inesperado al contrastar",
      },
      { status: 502 },
    );
  }
}
