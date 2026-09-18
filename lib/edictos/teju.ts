import * as cheerio from "cheerio";

const BUSCADOR = "https://www.boe.es/buscar/edictos_judiciales.php";
const USER_AGENT = "litigmeter/0.1 (evidencia de edictos TEJU)";

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export interface EdictoTeju {
  referencia: string;
  organo: string;
  provincia: string;
  comunidad_autonoma?: string;
  localidad?: string;
  fecha_publicacion: string;
  fecha_edicto?: string;
  procedimiento: string;
  url: string;
}

export interface DocumentoTeju {
  seccion?: string;
  organo?: string;
  provincia?: string;
  procedimiento?: string;
  resolucion?: string;
  objeto?: string;
  /** Texto para clasificar: sin la sección de destinatarios ni datos personales. */
  textoClasificable: string;
}

function fechaEspanolaAIso(texto: string): string | undefined {
  const coincidencia = texto.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (!coincidencia) return undefined;
  const mes = MESES[coincidencia[2].toLowerCase()];
  if (!mes) return undefined;
  return `${coincidencia[3]}-${String(mes).padStart(2, "0")}-${String(coincidencia[1]).padStart(2, "0")}`;
}

function fechaNumericaAIso(texto: string): string | undefined {
  const coincidencia = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!coincidencia) return undefined;
  return `${coincidencia[3]}-${coincidencia[2].padStart(2, "0")}-${coincidencia[1].padStart(2, "0")}`;
}

function limpiar(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

export async function buscarEdictos(opciones: {
  desde?: string;
  hasta?: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ edictos: EdictoTeju[]; siguiente?: string }> {
  const fetchImpl = opciones.fetchImpl ?? fetch;
  let url: string;
  if (opciones.url) {
    url = opciones.url;
  } else {
    const params = new URLSearchParams();
    params.set("campo[0]", "DOC");
    params.set("dato[0]", "");
    params.set("operador[0]", "and");
    params.set("campo[1]", "DEM");
    params.set("dato[1]", "");
    params.set("operador[1]", "and");
    params.set("campo[2]", "JUR");
    params.set("dato[2]", "");
    params.set("operador[2]", "and");
    params.set("campo[3]", "NBO");
    params.set("dato[3]", "");
    params.set("operador[4]", "and");
    params.set("campo[4]", "FPU");
    params.set("dato[4][0]", opciones.desde ?? "");
    params.set("dato[4][1]", opciones.hasta ?? "");
    params.set("page_hits", "50");
    params.set("sort_field[0]", "FPU");
    params.set("sort_order[0]", "desc");
    params.set("sort_field[1]", "id");
    params.set("sort_order[1]", "asc");
    params.set("accion", "Buscar");
    url = `${BUSCADOR}?${params.toString()}`;
  }

  const respuesta = await fetchImpl(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-ES,es;q=0.9" },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en TEJU`);
  const html = await respuesta.text();
  const $ = cheerio.load(html);

  const edictos: EdictoTeju[] = [];
  $("li.resultado-busqueda").each((_, el) => {
    const organo = limpiar($(el).find("p.linea-pub").text());
    const publicacion = limpiar($(el).find("p.linea-dem").text());
    const parrafos = $(el).children("p");
    const resumen = limpiar(parrafos.eq(2).text());
    const enlace = $(el).find("a.resultado-busqueda-link-otro");
    const href = enlace.attr("href");
    if (!organo || !href) return;

    const provincia = organo.split(" - ").at(-1) ?? "";
    const coincidenciaResumen = resumen.match(
      /Edicto de (.+?) en procedimiento (\w+)(?: n[úu]mero (\S+))?/i,
    );
    const referencia =
      enlace.attr("title")?.replace(/^Ref\.\s*/i, "") ?? href.split("id=")[1] ?? "";
    edictos.push({
      referencia,
      organo,
      provincia,
      fecha_publicacion: fechaNumericaAIso(publicacion) ?? "",
      fecha_edicto: coincidenciaResumen ? fechaEspanolaAIso(coincidenciaResumen[1]) : undefined,
      procedimiento: coincidenciaResumen?.[2] ?? "",
      localidad: resumen.split(".")[0]?.trim(),
      url: new URL(href, "https://www.boe.es").href,
    });
  });

  const siguienteHref = $("a[href*='accion=Mas']").first().attr("href");
  return {
    edictos,
    siguiente: siguienteHref ? new URL(siguienteHref, BUSCADOR).href : undefined,
  };
}

/**
 * Lee un documento TEJU: usa solo órgano, procedimiento, resolución y objeto.
 * La sección de destinatarios (nombres y documentos) queda fuera del texto
 * clasificable, además de la redacción de datos personales del clasificador.
 */
export function leerDocumentoTeju(html: string): DocumentoTeju {
  const $ = cheerio.load(html);

  let seccion: string | undefined;
  $("dl dt").each((_, dt) => {
    const etiqueta = limpiar($(dt).text()).toLowerCase();
    const valor = limpiar($(dt).next("dd").text());
    if (etiqueta.startsWith("sección") && valor) seccion = valor.split(".")[0]?.trim();
  });

  let organo: string | undefined;
  $("dl dt").each((_, dt) => {
    if (limpiar($(dt).text()).toLowerCase().startsWith("departamento")) {
      organo = limpiar($(dt).next("dd").text());
    }
  });

  let provincia: string | undefined;
  $("#textoxslt p").each((_, p) => {
    const texto = limpiar($(p).text());
    const coincidencia = texto.match(/^Provincia:\s*(.+)$/i);
    if (coincidencia) provincia = coincidencia[1];
  });

  const trasArticulo = (titulo: string): string | undefined => {
    let valor: string | undefined;
    $("#textoxslt h5.articulo").each((_, h5) => {
      if (valor) return;
      if (limpiar($(h5).text()).toUpperCase().includes(titulo)) {
        valor = limpiar($(h5).next("p").text());
      }
    });
    return valor;
  };

  let objeto: string | undefined;
  $("#textoxslt p").each((_, p) => {
    if (objeto) return;
    if (/^Objeto de la publicación edictal:/i.test(limpiar($(p).text()))) {
      objeto = limpiar($(p).next("p").text());
    }
  });

  const procedimiento = trasArticulo("PROCEDIMIENTO");
  const resolucion = trasArticulo("RESOLUCIÓN PROCESAL");
  const partes = [
    seccion ? `Sección ${seccion}` : undefined,
    organo,
    procedimiento ? `Procedimiento: ${procedimiento}` : undefined,
    resolucion ? `Resolución: ${resolucion}` : undefined,
    objeto ? `Objeto: ${objeto}` : undefined,
  ].filter((parte): parte is string => Boolean(parte));

  return {
    seccion,
    organo,
    provincia,
    procedimiento,
    resolucion,
    objeto,
    textoClasificable: partes.join(". "),
  };
}
