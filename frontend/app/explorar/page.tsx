import type { Metadata } from "next";
import { Suspense } from "react";
import { Explorer } from "@/components/explorer";

export const metadata: Metadata = { title: "Explorar Minas Gerais" };

export default function ExplorePage() {
  return <Suspense fallback={<main className="page-status">Carregando o explorador…</main>}><Explorer /></Suspense>;
}
