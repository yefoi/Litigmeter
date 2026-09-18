"use client";

import { useState } from "react";
import styles from "../page.module.css";

const EJEMPLOS = [
  "La litigiosidad bajó en Madrid en el último trimestre",
  "Canarias tiene la tasa más alta de España",
  "La litigiosidad subió en todas las comunidades",
];

const ETIQUETA_VEREDICTO: Record<string, string> = {
  respaldada: "Respaldada",
  contradicha: "Contradicha",
  matizable: "Matizable",
  sin_datos: "Sin datos",
};

interface Resultado {
  veredicto: string;
  confianza?: number;
  ambito: string;
  evidencia: string;
}

function claseVeredicto(veredicto: string): string {
  if (veredicto === "respaldada") return styles.tendenciaMejora;
  if (veredicto === "contradicha") return styles.tendenciaEmpeora;
  return styles.tendenciaEstable;
}

export default function FormularioContraste() {
  const [afirmacion, setAfirmacion] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const respuesta = await fetch("/api/contraste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ afirmacion }),
      });
      const datos = (await respuesta.json()) as Resultado & { error?: string };
      if (!respuesta.ok) {
        setError(datos.error ?? "Error inesperado al contrastar.");
        return;
      }
      setResultado(datos);
    } catch {
      setError("No se pudo conectar con el servicio de contraste.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.contraste}>
      <form onSubmit={enviar} className={styles.contrasteForm}>
        <label htmlFor="afirmacion">Afirmación a contrastar</label>
        <textarea
          id="afirmacion"
          value={afirmacion}
          maxLength={500}
          rows={3}
          onChange={(evento) => setAfirmacion(evento.target.value)}
          placeholder="Ej.: La litigiosidad bajó en Madrid el último trimestre"
          className={styles.contrasteArea}
        />
        <div className={styles.contrasteAcciones}>
          <button
            type="submit"
            className={styles.controlBoton}
            disabled={cargando || afirmacion.trim().length < 10}
          >
            {cargando ? "Contrastando…" : "Contrastar"}
          </button>
          <span className={styles.controlContador}>{afirmacion.length}/500</span>
        </div>
      </form>

      <div className={styles.contrasteEjemplos}>
        {EJEMPLOS.map((ejemplo) => (
          <button
            key={ejemplo}
            type="button"
            className={styles.chip}
            onClick={() => setAfirmacion(ejemplo)}
          >
            {ejemplo}
          </button>
        ))}
      </div>

      {error ? <p className={styles.aviso}>{error}</p> : null}

      {resultado ? (
        <div className={styles.contrasteResultado}>
          <span className={`${styles.insignia} ${claseVeredicto(resultado.veredicto)}`}>
            {ETIQUETA_VEREDICTO[resultado.veredicto] ?? resultado.veredicto}
          </span>
          <p className={styles.fichaDetalle}>
            Ámbito: {resultado.ambito}
            {resultado.confianza !== undefined
              ? ` · confianza ${(resultado.confianza * 100).toFixed(0)} %`
              : ""}
          </p>
          <p>{resultado.evidencia}</p>
        </div>
      ) : null}
    </div>
  );
}
