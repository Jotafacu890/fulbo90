import { Suspense } from "react";
import { ChallengeError } from "@/components/games/shared/ChallengeError";
import { GameLayout } from "@/components/games/shared/GameLayout";
import { AlreadyPlayed } from "@/components/games/shared/AlreadyPlayed";
import { ModeTabs } from "@/components/games/shared/ModeTabs";
import { GridGame } from "@/components/games/grid/GridGame";
import { GridSkeleton } from "@/components/games/grid/GridSkeleton";
import { gridEngine, type GridPayload } from "@/lib/game-engine/games/grid";
import { tryLoadChallenge } from "@/lib/game-engine/load-challenge";
import { prepareGameSession } from "@/lib/game-engine/game-session";
import { resolveGameRequest } from "@/lib/game-engine/page-request";
import { gameMetadata } from "@/lib/games/metadata";

export const metadata = gameMetadata("grid");

export default function GridPage({ searchParams }: PageProps<"/juegos/grid">) {
  return (
    <GameLayout slug="grid">
      <Suspense fallback={<GridSkeleton />}>
        <GridLoader searchParams={searchParams} />
      </Suspense>
    </GameLayout>
  );
}

async function GridLoader({ searchParams }: { searchParams: PageProps<"/juegos/grid">["searchParams"] }) {
  const req = await resolveGameRequest("grid", searchParams);
  const { challenge: ch, error } = await tryLoadChallenge<GridPayload>("grid", req.token);
  if (!ch) return <ChallengeError slug="grid" message={error} />;
  const session = await prepareGameSession("grid", ch.key, req.mode === "daily" ? req.date : undefined);
  return (
    <>
      <ModeTabs slug="grid" mode={req.mode} number={ch.number} date={req.date} today={req.today} />
      {session.existing ? (
        <AlreadyPlayed slug="grid" result={session.existing} />
      ) : (
        <GridGame
          key={ch.key}
          challenge={{ game: "grid", token: req.token, key: ch.key, mode: req.mode, date: req.date, number: ch.number, ticket: session.ticket, loggedIn: session.loggedIn }}
          grid={gridEngine.toPublic(ch.payload, ch.index)}
        />
      )}
    </>
  );
}
