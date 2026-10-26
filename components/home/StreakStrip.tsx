"use client";

import { ChartColumn, Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { useArgentinaToday, useStorageValue } from "@/lib/client/hooks";
import { COPY } from "@/lib/config/copy";
import { AVAILABLE_GAMES } from "@/lib/games/registry";
import { EMPTY_STATS, effectiveStreak, localStats, type GameStats } from "@/lib/stats/local-stats";
import { cn } from "@/lib/utils";

/** Resumen personal en la home: racha, partidas y diarios completados. */
export function StreakStrip({ className }: { className?: string }) {
  const today = useArgentinaToday();
  const all = useStorageValue<GameStats[]>(
    () => AVAILABLE_GAMES.map((g) => localStats.get(g.slug)),
    AVAILABLE_GAMES.map(() => EMPTY_STATS),
  );
  const streak = today ? Math.max(0, ...all.map((s) => effectiveStreak(s, today))) : 0;
  const played = all.reduce((n, s) => n + s.played, 0);
  const daily = all.reduce((n, s) => n + s.dailyCompleted, 0);

  return (
    <Link href="/estadisticas" className={cn("inline-flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line bg-night/60 px-4 py-2.5 text-sm transition-colors hover:border-gold/50", className)}>
      <span className="flex items-center gap-1.5 font-bold">
        <Flame className={cn("size-4", streak > 0 ? "text-gold" : "text-mist")} />
        {streak > 1 ? (
          <>
            <span className="text-gold">{COPY.streak}</span> {streak} días
          </>
        ) : (
          <>Racha: {streak}</>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-mist">
        <Trophy className="size-4" /> {played} partidos
      </span>
      <span className="flex items-center gap-1.5 text-mist">
        <ChartColumn className="size-4" /> {daily} diarios
      </span>
    </Link>
  );
}
