import type { FicheroIndicadores } from "../indicadores/tipos";
import type { InformeTrimestral } from "./tipos";

export const VERSION_INDICE = 1;

/** Pesos del índice de presión judicial; si falta un indicador, se renormalizan. */
export const PESOS_INDICE = {
  nivel: 0.4,
  tendencia: 0.25,
  congestion: 0.2,
  pendencia: 0.15,
} as const;

export interface ComponentesIndice {
  nivel?: number;
  tendencia?: number;
  congestion?: number;
  pendencia?: number;
}

export interface ResultadoIndice {
  version: number;
  /** Presión normalizada de 0 (mejor) a 100 (peor). */
  valor: number;
  componentes: ComponentesIndice;
  pesos_usados: Record<string, number>;
}

export interface EntradaIndice {
  tasa: number;
  variacion_interanual_pct?: number;
  congestion?: number;
  pendencia?: number;
  contexto: {
    tasas: number[];
    congestiones?: number[];
    pendencias?: number[];
  };
}

function normalizar(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor) || maximo === minimo) return 0.5;
  return Math.min(1, Math.max(0, (valor - minimo) / (maximo - minimo)));
}

function redondear(valor: number, decimales = 3): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function calcularIndice(entrada: EntradaIndice): ResultadoIndice {
  const componentes: ComponentesIndice = {
    nivel: normalizar(
      entrada.tasa,
      Math.min(...entrada.contexto.tasas),
      Math.max(...entrada.contexto.tasas),
    ),
  };

  if (entrada.variacion_interanual_pct !== undefined) {
    componentes.tendencia = Math.min(
      1,
      Math.max(0, 0.5 + entrada.variacion_interanual_pct / 40),
    );
  }

  if (entrada.congestion !== undefined && (entrada.contexto.congestiones?.length ?? 0) > 0) {
    componentes.congestion = normalizar(
      entrada.congestion,
      Math.min(...entrada.contexto.congestiones!),
      Math.max(...entrada.contexto.congestiones!),
    );
  }

  if (entrada.pendencia !== undefined && (entrada.contexto.pendencias?.length ?? 0) > 0) {
    componentes.pendencia = normalizar(
      entrada.pendencia,
      Math.min(...entrada.contexto.pendencias!),
      Math.max(...entrada.contexto.pendencias!),
    );
  }

  const disponibles = Object.entries(componentes).filter(
    (entradaComponente): entradaComponente is [keyof ComponentesIndice, number] =>
      entradaComponente[1] !== undefined,
  );
  const pesoTotal = disponibles.reduce(
    (total, [clave]) => total + PESOS_INDICE[clave],
    0,
  );

  const pesosUsados: Record<string, number> = {};
  let valor = 0;
  for (const [clave, componente] of disponibles) {
    const peso = PESOS_INDICE[clave] / pesoTotal;
    pesosUsados[clave] = redondear(peso);
    valor += componente * peso;
  }

  return {
    version: VERSION_INDICE,
    valor: redondear(valor * 100, 1),
    componentes,
    pesos_usados: pesosUsados,
  };
}

export function indicesDeInforme(
  informe: InformeTrimestral,
  indicadores?: FicheroIndicadores,
): Map<string, ResultadoIndice> {
  const tasas = informe.comunidades.map((comunidad) => comunidad.tasa_litigiosidad);
  const congestiones = informe.comunidades
    .map((comunidad) => indicadores?.comunidades[comunidad.comunidad_autonoma]?.congestion)
    .filter((valor): valor is number => typeof valor === "number");
  const pendencias = informe.comunidades
    .map((comunidad) => indicadores?.comunidades[comunidad.comunidad_autonoma]?.pendencia)
    .filter((valor): valor is number => typeof valor === "number");

  const indices = new Map<string, ResultadoIndice>();
  for (const comunidad of informe.comunidades) {
    const tasasComunidad = indicadores?.comunidades[comunidad.comunidad_autonoma];
    indices.set(
      comunidad.comunidad_autonoma,
      calcularIndice({
        tasa: comunidad.tasa_litigiosidad,
        variacion_interanual_pct: comunidad.variacion_interanual_pct,
        congestion: tasasComunidad?.congestion,
        pendencia: tasasComunidad?.pendencia,
        contexto: { tasas, congestiones, pendencias },
      }),
    );
  }
  return indices;
}
