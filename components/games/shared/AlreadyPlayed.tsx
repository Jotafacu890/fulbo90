import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { StatTile } from "@/components/ui/primitives";
import { COPY } from "@/lib/config/copy";
import type { GameSlug } from "@/lib/games/registry";
import { formatTime } from "@/lib/utils";

/** El usuario autenticado ya tiene guardado este desafío en su cuenta (en cualquier dispositivo). */
export function AlreadyPlayed({ slug, result }: { slug: GameSlug; result: { score: number; maxScore: number; rarity: number | null; timeMs: number | null } }) {
  return (
    <div className="card p-6 text-center">
      <CheckCircle2 className="mx-auto size-10 text-grass-bright" aria-hidden />
      <p className="display mt-3 text-4xl">{COPY.completed}</p>
      <p className="mt-1 text-sm text-mist">Ya jugaste este desafío. Tu resultado está guardado en tu cuenta.</p>
      <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
        <StatTile label="Resultado" value={`${result.score}/${result.maxScore}`} />
        <StatTile label="Tiempo" value={result.timeMs ? formatTime(result.timeMs) : "—"} />
        <StatTile label="Rareza" value={result.rarity ?? "—"} />
      </div>
      <ButtonLink href={`/juegos/${slug}?modo=infinito`} className="mt-6" prefetch={false}>
        Seguir jugando en modo infinito
      </ButtonLink>
    </div>
  );
}
