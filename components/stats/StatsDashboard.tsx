"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { GameIcon } from "@/components/ui/GameIcon";
import { StatTile } from "@/components/ui/primitives";
import { useArgentinaToday, useStorageValue } from "@/lib/client/hooks";
import { AVAILABLE_GAMES } from "@/lib/games/registry";
import { EMPTY_STATS, effectiveStreak, localStats, type GameStats } from "@/lib/stats/local-stats";
import { formatTime } from "@/lib/utils";

export function StatsDashboard() {
  const today = useArgentinaToday();
  const all = useStorageValue<GameStats[]>(
    () => AVAILABLE_GAMES.map((g) => localStats.get(g.slug)),
    AVAILABLE_GAMES.map(() => EMPTY_STATS),
  );

  const totals = all.reduce(
    (acc, s) => ({ played: acc.played + s.played, wins: acc.wins + s.wins, daily: acc.daily + s.dailyCompleted, score: acc.score + s.totalScore, max: acc.max + s.totalMax }),
    { played: 0, wins: 0, daily: 0, score: 0, max: 0 },
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Partidas" value={totals.played} />
        <StatTile label="Victorias" value={totals.wins} />
        <StatTile label="Diarios completados" value={totals.daily} />
        <StatTile label="Promedio de aciertos" value={totals.max ? `${Math.round((totals.score / totals.max) * 100)}%` : "—"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {AVAILABLE_GAMES.map((g, i) => {
          const s = all[i];
          const streak = today ? effectiveStreak(s, today) : 0;
          return (
            <div key={g.slug} className="card p-5">
              <div className="flex items-center gap-3">
                <GameIcon name={g.icon} accent={g.accent} />
                <Link href={`/juegos/${g.slug}`} className="display flex-1 text-3xl hover:text-gold">
                  {g.name}
                </Link>
                <span className="flex items-center gap-1 text-lg font-black text-gold">
                  <Flame className="size-5" /> {streak}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatTile label="Jugadas" value={s.played} />
                <StatTile label="Victorias" value={s.played ? `${Math.round((s.wins / s.played) * 100)}%` : "—"} />
                <StatTile label="Mejor racha" value={s.bestStreak} />
                <StatTile label="Promedio" value={s.totalMax ? `${Math.round((s.totalScore / s.totalMax) * 100)}%` : "—"} />
                <StatTile label="Mejor tiempo" value={s.bestTimeMs ? formatTime(s.bestTimeMs) : "—"} />
                {g.slug === "grid" ? <StatTile label="Mejor rareza" value={s.bestRarity ?? "—"} /> : <StatTile label="Diarios" value={s.dailyCompleted} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
