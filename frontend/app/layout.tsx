import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GeoPulse — Visualização geográfica para a ciência", template: "%s | GeoPulse" },
  description: "Visualização geográfica para cientistas e pesquisadores. Importe dados em CSV, explore padrões espaciais e compare regiões em mapas interativos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
