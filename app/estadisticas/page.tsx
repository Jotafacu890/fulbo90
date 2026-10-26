import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountResults } from "@/components/stats/AccountResults";
import { StatsDashboard } from "@/components/stats/StatsDashboard";

export const metadata: Metadata = { title: "Tus estadísticas", description: "Partidas, rachas y récords guardados en tu navegador." };

export default function StatsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <h1 className="display text-5xl">Tus estadísticas</h1>
      <p className="mt-1 text-sm text-mist">Las de este navegador. Con una cuenta, además quedan guardadas en la nube.</p>
      <StatsDashboard />
      <Suspense fallback={null}>
        <AccountResults />
      </Suspense>
    </div>
  );
}
