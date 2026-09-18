import path from "node:path";
import { calcularAlertas, escribirAlertas, leerAlertas, type Alerta } from "../lib/alertas";
import { leerInformes } from "../lib/litigiosidad/historico";

function opcion(nombre: string): string | undefined {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((argumento) => argumento.startsWith(prefijo));
  return encontrado?.slice(prefijo.length);
}

function claveAlerta(alerta: Alerta): string {
  return `${alerta.comunidad_autonoma}|${alerta.tipo}`;
}

async function enviarEmail(alertas: Alerta[], anio: number, trimestre: number): Promise<void> {
  const clave = process.env.RESEND_API_KEY;
  const destino = process.env.ALERTAS_DESTINO;
  if (!clave || !destino) return;

  const cuerpo = alertas
    .map((alerta) => `- [${alerta.severidad}] ${alerta.comunidad_autonoma}: ${alerta.detalle}`)
    .join("\n");
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${clave}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.ALERTAS_REMITENTE ?? "Litigmeter <onboarding@resend.dev>",
      to: [destino],
      subject: `Litigmeter · alertas ${anio}-T${trimestre}`,
      text: cuerpo,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`Resend HTTP ${respuesta.status}`);
  }
  console.log(`Email de alertas enviado a ${destino}`);
}

async function main(): Promise<void> {
  const dataBase = opcion("data") ?? path.join(process.cwd(), "data");
  const informes = await leerInformes(path.join(dataBase, "litigiosidad"));
  const ultimo = informes.at(-1);
  if (!ultimo) throw new Error("No hay informes para calcular alertas");

  const anteriores = await leerAlertas(dataBase);
  const alertas = calcularAlertas(informes);
  const fichero = {
    version_esquema: 1 as const,
    anio: ultimo.anio,
    trimestre: ultimo.trimestre,
    generado_en: new Date().toISOString(),
    alertas,
  };
  const destino = await escribirAlertas(dataBase, fichero);

  const altas = alertas.filter((alerta) => alerta.severidad === "alta");
  const clavesAnteriores = new Set(
    (anteriores?.anio === ultimo.anio && anteriores.trimestre === ultimo.trimestre
      ? anteriores.alertas
      : []
    ).map(claveAlerta),
  );
  const nuevasAltas = altas.filter((alerta) => !clavesAnteriores.has(claveAlerta(alerta)));

  console.log(
    `Alertas ${ultimo.anio}-T${ultimo.trimestre}: ${alertas.length} ` +
      `(${altas.length} altas, ${nuevasAltas.length} nuevas altas) → ${destino}`,
  );
  for (const alerta of alertas.slice(0, 10)) {
    console.log(`  [${alerta.severidad}] ${alerta.comunidad_autonoma}: ${alerta.detalle}`);
  }

  if (nuevasAltas.length > 0) {
    try {
      await enviarEmail(nuevasAltas, ultimo.anio, ultimo.trimestre);
    } catch (error) {
      console.error(`No se pudo enviar el email: ${error instanceof Error ? error.message : error}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
