import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GameIcon } from "@/components/ui/GameIcon";
import { DifficultyDots } from "@/components/ui/primitives";
import { getGame, type GameSlug } from "@/lib/games/registry";
import { GAME_RULES } from "@/lib/games/rules";
import { RulesButton } from "./RulesButton";

/** Encabezado común de cada juego (estático: se prerenderiza). */
export function GameLayout({ slug, children }: { slug: GameSlug; children: ReactNode }) {
  const game = getGame(slug)!;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:pt-6">
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-mist hover:text-chalk">
        <ChevronLeft className="size-4" /> Todos los juegos
      </Link>
      <div className="mb-5 flex items-start gap-3">
        <GameIcon name={game.icon} accent={game.accent} />
        <div className="min-w-0 flex-1">
          <h1 className="display text-4xl sm:text-5xl">{game.name}</h1>
          <p className="mt-1 text-sm text-mist">{game.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RulesButton title={game.name} rules={GAME_RULES[slug] ?? []} />
          <DifficultyDots level={game.difficulty} className="hidden sm:inline-flex" />
        </div>
      </div>
      {children}
    </div>
  );
}
