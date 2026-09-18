import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { sitioPublico } from "@/lib/sitio";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(sitioPublico()),
  title: "Litigmeter · Litigiosidad judicial por CCAA",
  description:
    "Litigmeter: tasa de litigiosidad trimestral por comunidad autónoma a partir de las notas de prensa del CGPJ, con tendencia, gravedad y noticiabilidad clasificadas por jev (TypeSafe AI).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
