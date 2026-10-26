import { Lock } from "lucide-react";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { GameIcon } from "@/components/ui/GameIcon";
import { DifficultyDots } from "@/components/ui/primitives";
import { gameMetadata } from "@/lib/games/metadata";
import { GAMES, getGame } from "@/lib/games/registry";

/** Juegos "próximamente". Los disponibles tienen su propia carpeta (que tiene prioridad sobre esta ruta). */
export function generateStaticParams() {
  return GAMES.filter((g) => g.status === "soon").map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/juegos/[slug]">) {
  const { slug } = await params;
  return gameMetadata(slug);
}

export default async function UpcomingGamePage({ params }: PageProps<"/juegos/[slug]">) {
  const { slug } = await params;
  const game = getGame(slug);
  if (!game || game.status !== "soon") notFound();
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <GameIcon name={game.icon} accent={game.accent} className="mx-auto size-16" />
      <h1 className="display mt-5 text-5xl">{game.name}</h1>
      <p className="mt-2 text-lg text-mist">{game.description}</p>
      <div className="mt-3 flex justify-center">
        <DifficultyDots level={game.difficulty} />
      </div>
      <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-gold">
        <Lock className="size-4" /> Próximamente
      </p>
      <div className="mt-8">
        <ButtonLink href="/#juegos">Jugar los disponibles</ButtonLink>
      </div>
    </div>
  );
}
