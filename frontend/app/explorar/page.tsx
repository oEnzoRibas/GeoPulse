import type { Metadata } from "next";
import { Suspense } from "react";
import { WorldViewer } from "@/components/world-viewer";

export const metadata: Metadata = { title: "Visualizador mundial" };

export default function ExplorePage() {
  return <Suspense fallback={<main className="page-status">Carregando o explorador…</main>}><WorldViewer /></Suspense>;
}
