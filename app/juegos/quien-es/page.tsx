import { Suspense } from "react";
import { ChallengeError } from "@/components/games/shared/ChallengeError";
import { GameLayout } from "@/components/games/shared/GameLayout";
import { ListSkeleton } from "@/components/games/shared/ListSkeleton";
import { AlreadyPlayed } from "@/components/games/shared/AlreadyPlayed";
import { ModeTabs } from "@/components/games/shared/ModeTabs";
import { WhoIsGame } from "@/components/games/who-is/WhoIsGame";
import type { WhoIsPayload } from "@/lib/game-engine/games/who-is";
import { tryLoadChallenge } from "@/lib/game-engine/load-challenge";
import { prepareGameSession } from "@/lib/game-engine/game-session";
import { resolveGameRequest } from "@/lib/game-engine/page-request";
import { gameMetadata } from "@/lib/games/metadata";

export const metadata = gameMetadata("quien-es");

export default function WhoIsPage({ searchParams }: PageProps<"/juegos/quien-es">) {
  return (
    <GameLayout slug="quien-es">
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <WhoIsLoader searchParams={searchParams} />
      </Suspense>
    </GameLayout>
  );
}

async function WhoIsLoader({ searchParams }: { searchParams: PageProps<"/juegos/quien-es">["searchParams"] }) {
  const req = await resolveGameRequest("quien-es", searchParams);
  const { challenge: ch, error } = await tryLoadChallenge<WhoIsPayload>("quien-es", req.token);
  if (!ch) return <ChallengeError slug="quien-es" message={error} />;
  const session = await prepareGameSession("quien-es", ch.key, req.mode === "daily" ? req.date : undefined);
  return (
    <>
      <ModeTabs slug="quien-es" mode={req.mode} number={ch.number} date={req.date} today={req.today} />
      {session.existing ? (
        <AlreadyPlayed slug="quien-es" result={session.existing} />
      ) : (
        <WhoIsGame
          key={ch.key}
          challenge={{ game: "quien-es", token: req.token, key: ch.key, mode: req.mode, date: req.date, number: ch.number, ticket: session.ticket, loggedIn: session.loggedIn }}
          firstClue={ch.payload.clues[0]}
          totalClues={ch.payload.clues.length}
        />
      )}
    </>
  );
}
