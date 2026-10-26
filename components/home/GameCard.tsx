"use client";

import { Check, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { GameIcon } from "@/components/ui/GameIcon";
import { Badge, DifficultyDots } from "@/components/ui/primitives";
import { useArgentinaToday, useStorageValue } from "@/lib/client/hooks";
import { readJSON } from "@/lib/client/storage";
import { challengeNumber } from "@/lib/game-engine/daily";
import type { GameMeta } from "@/lib/games/registry";
import type { DailyRecord } from "@/lib/stats/local-stats";
import { cn } from "@/lib/utils";

export function useDailyRecord(slug: string, today: string | null) {
  return useStorageValue<DailyRecord | null>(() => (today ? readJSON<DailyRecord>(`daily:${slug}:${today}`) : null), null);
}

export function GameCard({ game, index = 0 }: { game: GameMeta; index?: number }) {
  const today = useArgentinaToday();
  const record = useDailyRecord(game.slug, today);
  const soon = game.status === "soon";
  const number = today && game.daily ? challengeNumber(today, game.launchDate) : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <GameIcon name={game.icon} accent={game.accent} />
        {soon ? (
          <Badge>
            <Lock className="size-3" /> Próximamente
          </Badge>
        ) : record ? (
          <Badge tone="grass">
            <Check className="size-3" /> Jugado · {record.score}/{record.max}
          </Badge>
        ) : game.daily ? (
          <Badge tone="gold">
            <Clock className="size-3" /> Pendiente
          </Badge>
        ) : null}
      </div>
      <h3 className="display mt-4 text-3xl">{game.name}</h3>
      <p className="mt-1 flex-1 text-sm text-mist">{game.tagline}</p>
      <div className="mt-4 flex items-center justify-between">
        <DifficultyDots level={game.difficulty} />
        {soon ? (
          <span className="text-xs font-bold uppercase tracking-wider text-mist-2">En camino</span>
        ) : (
          <span className="rounded-lg bg-grass px-4 py-2 text-xs font-black uppercase tracking-wider text-night transition-colors group-hover:bg-grass-bright">
            {record ? "Ver" : "Jugar"}
            {number ? <span className="ml-1 opacity-70">#{number}</span> : null}
          </span>
        )}
      </div>
    </>
  );

  const cls = cn("card group flex h-full animate-rise flex-col p-5 transition-all", soon ? "opacity-70" : "hover:-translate-y-0.5 hover:border-grass/60");
  const style = { animationDelay: `${index * 40}ms` };

  return (
    <Link href={`/juegos/${game.slug}`} className={cls} style={style}>
      {body}
    </Link>
  );
}
