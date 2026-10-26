"use client";

import { Check, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { NextDailyCountdown } from "@/components/layout/NextDailyCountdown";
import { GameIcon } from "@/components/ui/GameIcon";
import { ProgressBar } from "@/components/ui/primitives";
import { useArgentinaToday, useStorageValue } from "@/lib/client/hooks";
import { readJSON } from "@/lib/client/storage";
import { challengeNumber } from "@/lib/game-engine/daily";
import { DAILY_GAMES } from "@/lib/games/registry";
import type { DailyRecord } from "@/lib/stats/local-stats";
import { cn, formatLongDate } from "@/lib/utils";

/** "🔥 Desafío del día": la combinación fija de juegos que todos reciben hoy. */
export function DailyChallenge() {
  const today = useArgentinaToday();
  const records = useStorageValue<(DailyRecord | null)[]>(
    () => DAILY_GAMES.map((g) => (today ? readJSON<DailyRecord>(`daily:${g.slug}:${today}`) : null)),
    DAILY_GAMES.map(() => null),
  );
  const done = records.filter(Boolean).length;

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gold/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display flex items-center gap-2 text-4xl">
            <Flame className="size-8 text-gold" aria-hidden /> Desafío del día
          </h2>
          <p className="mt-1 text-sm text-mist first-letter:uppercase">{today ? formatLongDate(today) : " "}</p>
        </div>
        <NextDailyCountdown />
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <ProgressBar value={done} max={DAILY_GAMES.length} tone="gold" className="flex-1" />
        <span className="tabular text-sm font-bold">
          {done}/{DAILY_GAMES.length}
        </span>
      </div>

      <ul className="relative mt-4 grid gap-2 sm:grid-cols-2">
        {DAILY_GAMES.map((g, i) => {
          const r = records[i];
          return (
            <li key={g.slug}>
              <Link
                href={`/juegos/${g.slug}`}
                className={cn("flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors", r ? "border-grass/40 bg-grass/10" : "border-line bg-night/50 hover:border-gold/60")}
              >
                <GameIcon name={g.icon} accent={g.accent} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {g.name} <span className="tabular text-mist">{today ? `#${challengeNumber(today, g.launchDate)}` : ""}</span>
                  </span>
                  <span className="text-xs text-mist">{r ? `Resultado: ${r.score}/${r.max}` : g.tagline}</span>
                </span>
                {r ? <Check className="size-5 text-grass-bright" /> : <ChevronRight className="size-5 text-mist" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
