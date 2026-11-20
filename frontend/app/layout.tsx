import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GeoPulse — Inteligência territorial", template: "%s | GeoPulse" },
  description: "Explore os 853 municípios de Minas Gerais com dados oficiais do Censo 2022.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
