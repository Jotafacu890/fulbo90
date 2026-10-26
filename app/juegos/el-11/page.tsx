import { Suspense } from "react";
import { ChallengeError } from "@/components/games/shared/ChallengeError";
import { GameLayout } from "@/components/games/shared/GameLayout";
import { ListSkeleton } from "@/components/games/shared/ListSkeleton";
import { AlreadyPlayed } from "@/components/games/shared/AlreadyPlayed";
import { ModeTabs } from "@/components/games/shared/ModeTabs";
import { ElevenGame } from "@/components/games/starting-eleven/ElevenGame";
import { ELEVEN_VARIANT_IDS, elevenEngine, type ElevenPayload } from "@/lib/game-engine/games/starting-eleven";
import { tryLoadChallenge } from "@/lib/game-engine/load-challenge";
import { prepareGameSession } from "@/lib/game-engine/game-session";
import { resolveGameRequest } from "@/lib/game-engine/page-request";
import { gameMetadata } from "@/lib/games/metadata";

export const metadata = gameMetadata("el-11");

export default function ElevenPage({ searchParams }: PageProps<"/juegos/el-11">) {
  return (
    <GameLayout slug="el-11">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <ElevenLoader searchParams={searchParams} />
      </Suspense>
    </GameLayout>
  );
}

async function ElevenLoader({ searchParams }: { searchParams: PageProps<"/juegos/el-11">["searchParams"] }) {
  const req = await resolveGameRequest("el-11", searchParams, ELEVEN_VARIANT_IDS);
  const { challenge: ch, error } = await tryLoadChallenge<ElevenPayload>("el-11", req.token, { variant: req.variant });
  if (!ch) return <ChallengeError slug="el-11" message={error} />;
  const session = await prepareGameSession("el-11", ch.key, req.mode === "daily" ? req.date : undefined);
  return (
    <>
      <ModeTabs slug="el-11" mode={req.mode} number={ch.number} date={req.date} today={req.today} />
      {session.existing ? (
        <AlreadyPlayed slug="el-11" result={session.existing} />
      ) : (
        <ElevenGame
          key={ch.key}
          challenge={{ game: "el-11", token: req.token, key: ch.key, mode: req.mode, date: req.date, number: ch.number, variant: req.variant, ticket: session.ticket, loggedIn: session.loggedIn }}
          data={elevenEngine.toPublic(ch.payload, ch.index)}
        />
      )}
    </>
  );
}
