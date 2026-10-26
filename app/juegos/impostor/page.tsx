import { Suspense } from "react";
import { ImpostorGame } from "@/components/games/impostor/ImpostorGame";
import { ChallengeError } from "@/components/games/shared/ChallengeError";
import { GameLayout } from "@/components/games/shared/GameLayout";
import { ListSkeleton } from "@/components/games/shared/ListSkeleton";
import { AlreadyPlayed } from "@/components/games/shared/AlreadyPlayed";
import { ModeTabs } from "@/components/games/shared/ModeTabs";
import { impostorEngine, type ImpostorPayload } from "@/lib/game-engine/games/impostor";
import { tryLoadChallenge } from "@/lib/game-engine/load-challenge";
import { prepareGameSession } from "@/lib/game-engine/game-session";
import { resolveGameRequest } from "@/lib/game-engine/page-request";
import { gameMetadata } from "@/lib/games/metadata";

export const metadata = gameMetadata("impostor");

export default function ImpostorPage({ searchParams }: PageProps<"/juegos/impostor">) {
  return (
    <GameLayout slug="impostor">
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <ImpostorLoader searchParams={searchParams} />
      </Suspense>
    </GameLayout>
  );
}

async function ImpostorLoader({ searchParams }: { searchParams: PageProps<"/juegos/impostor">["searchParams"] }) {
  const req = await resolveGameRequest("impostor", searchParams);
  const { challenge: ch, error } = await tryLoadChallenge<ImpostorPayload>("impostor", req.token);
  if (!ch) return <ChallengeError slug="impostor" message={error} />;
  const session = await prepareGameSession("impostor", ch.key, req.mode === "daily" ? req.date : undefined);
  return (
    <>
      <ModeTabs slug="impostor" mode={req.mode} number={ch.number} date={req.date} today={req.today} />
      {session.existing ? (
        <AlreadyPlayed slug="impostor" result={session.existing} />
      ) : (
        <ImpostorGame
          key={ch.key}
          challenge={{ game: "impostor", token: req.token, key: ch.key, mode: req.mode, date: req.date, number: ch.number, ticket: session.ticket, loggedIn: session.loggedIn }}
          data={impostorEngine.toPublic(ch.payload, ch.index)}
        />
      )}
    </>
  );
}
