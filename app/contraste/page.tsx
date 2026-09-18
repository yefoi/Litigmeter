import type { Metadata } from "next";
import Link from "next/link";
import FormularioContraste from "../components/FormularioContraste";
import Logo from "../components/Logo";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "Contraste de afirmaciones · Litigmeter",
  description:
    "Comprueba una afirmación sobre litigiosidad judicial contra los últimos datos del CGPJ con jev (TypeSafe AI).",
};

export default function Page() {
  return (
    <main className={styles.main}>
      <nav className={styles.migas} aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span className={styles.migasSep}>/</span>
        <span>Contraste</span>
      </nav>

      <header className={styles.cabecera}>
        <div>
          <p className={styles.marcaCabecera}>
            <Logo />
          </p>
          <h1>Contraste de afirmaciones</h1>
          <p className={styles.subtitulo}>
            Pega una frase sobre litigiosidad —de una noticia, un informe o una red social— y
            jev la contrasta con los últimos datos del CGPJ.
          </p>
        </div>
      </header>

      <section className={styles.bloque}>
        <FormularioContraste />
      </section>

      <footer className={styles.pie}>
        <p>
          El veredicto lo decide el modelo a partir de los datos cargados; se muestran la
          evidencia y la confianza para que puedas juzgar. <Link href="/">Volver al panel</Link>.
        </p>
      </footer>
    </main>
  );
}
