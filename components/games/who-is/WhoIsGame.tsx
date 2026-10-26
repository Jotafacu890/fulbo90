"use client";

import { Lightbulb, Timer, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { PlayerSearch } from "@/components/player-search/PlayerSearch";
import { ResultModal } from "@/components/results/ResultModal";
import { Button } from "@/components/ui/Button";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { Flag } from "@/components/ui/Flag";
import { guessWhoIs, requestWhoIsClue, revealWhoIs, type WhoIsReveal } from "@/lib/actions/who-is";
import { useElapsed } from "@/lib/client/hooks";
import { playAgainHref, useFinishGame, useGameState } from "@/lib/client/use-game-state";
import type { Clue } from "@/lib/game-engine/games/who-is";
import { COPY } from "@/lib/config/copy";
import { whoIsShareText } from "@/lib/share";
import { cn, formatTime } from "@/lib/utils";
import type { PlayerSummary } from "@/types/football";
import type { ChallengeInfo } from "@/types/game";

const POINTS = [100, 80, 60, 45, 30, 15];

interface WhoIsState {
  ticket: string;
  clues: Clue[];
  wrong: PlayerSummary[];
  finished: boolean;
  won: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  streak?: number;
  share?: string;
  newRecord?: boolean;
}

export function WhoIsGame({ challenge, firstClue, totalClues }: { challenge: ChallengeInfo; firstClue: Clue; totalClues: number }) {
  const [state, setState, hydrated] = useGameState<WhoIsState>(challenge, () => ({
    ticket: challenge.ticket,
    clues: [firstClue],
    wrong: [],
    finished: false,
    won: false,
    startedAt: null,
    finishedAt: null,
  }));
  const latest = useRef(state);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [reveal, setReveal] = useState<WhoIsReveal | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const finishGame = useFinishGame(challenge);
  const elapsed = useElapsed(state.startedAt, hydrated && !state.finished, state.finishedAt && state.startedAt ? state.finishedAt - state.startedAt : undefined);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    if (state.finished && !reveal) {
      revealWhoIs(challenge.token, state.ticket)
        .then((res) => res.ok && setReveal(res))
        .catch(() => {});
    }
  }, [state.finished, state.ticket, reveal, challenge.token]);

  const used = state.clues.length;
  const points = state.won ? POINTS[used - 1] ?? 0 : 0;

  const finish = (s: WhoIsState, won: boolean) => {
    const finishedAt = Date.now();
    const pts = won ? POINTS[s.clues.length - 1] ?? 0 : 0;
    const { streak, share, newRecord } = finishGame({
      ticket: s.ticket,
      score: pts,
      max: 100,
      win: won,
      timeMs: s.startedAt ? finishedAt - s.startedAt : undefined,
      share: (st) =>
        whoIsShareText({ gameName: "¿Quién es?", number: challenge.number, infinite: challenge.mode !== "daily", cluesUsed: s.clues.length, totalClues, won, points: pts, streak: st }),
    });
    const next = { ...s, finished: true, won, finishedAt, streak, share, newRecord };
    latest.current = next;
    setState(next);
    window.setTimeout(() => setResultOpen(true), 900);
  };

  const onGuess = (player: PlayerSummary) => {
    startTransition(async () => {
      const base = { ...latest.current, startedAt: latest.current.startedAt ?? Date.now() };
      const res = await guessWhoIs(challenge.token, base.ticket, player.id).catch(() => null);
      if (!res || !res.ok) {
        setFeedback({ ok: false, text: res && !res.ok ? res.error : "No pudimos validar la respuesta. Probá de nuevo." });
        return;
      }
      const next: WhoIsState = { ...base, ticket: res.ticket, clues: res.clues, wrong: res.correct ? base.wrong : [...base.wrong, player] };
      latest.current = next;
      if (res.correct) {
        setFeedback({ ok: true, text: `${COPY.correct} Era ${player.name}.` });
        finish(next, true);
      } else if (res.done) {
        setFeedback({ ok: false, text: `${COPY.outOfAttempts} No era ${player.name} y se terminaron las pistas.` });
        finish(next, false);
      } else {
        setFeedback({ ok: false, text: `${COPY.wrong} No es ${player.name}. Nueva pista desbloqueada.` });
        setState(next);
      }
    });
  };

  const onHint = () => {
    startTransition(async () => {
      const base = { ...latest.current, startedAt: latest.current.startedAt ?? Date.now() };
      const res = await requestWhoIsClue(challenge.token, base.ticket).catch(() => null);
      if (!res || !res.ok) {
        setFeedback({ ok: false, text: res && !res.ok ? res.error : "No pudimos pedir la pista. Probá de nuevo." });
        return;
      }
      const next = { ...base, ticket: res.ticket, clues: res.clues };
      latest.current = next;
      setState(next);
      setFeedback(null);
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label={`Pista ${used} de ${totalClues}`}>
          {Array.from({ length: totalClues }, (_, i) => (
            <span key={i} className={cn("h-2 w-7 rounded-full transition-colors sm:w-10", i < used ? (state.won && i === used - 1 ? "bg-grass" : "bg-gold") : "bg-line-strong")} />
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="text-gold tabular">{state.finished ? points : POINTS[used - 1]} pts</span>
          <span className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5">
            <Timer className="size-4 text-mist" aria-hidden />
            <span className="tabular">{formatTime(elapsed)}</span>
          </span>
        </div>
      </div>

      <ol className="space-y-2">
        {state.clues.map((clue, i) => (
          <li key={i} className="card flex animate-rise items-center gap-3 px-4 py-3">
            <span className="display grid size-9 shrink-0 place-items-center rounded-lg bg-pitch text-xl text-gold">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-mist">{clue.label}</div>
              <div className="flex items-center gap-2 text-lg font-bold leading-tight">
                {clue.country && <Flag code={clue.country} className="h-4 w-6" />}
                {clue.value}
              </div>
            </div>
          </li>
        ))}
        {!state.finished &&
          Array.from({ length: totalClues - used }, (_, i) => (
            <li key={`locked-${i}`} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-4 py-3 text-mist-2">
              <span className="display grid size-9 place-items-center rounded-lg bg-night text-xl">{used + i + 1}</span>
              <span className="text-sm">Pista bloqueada · {POINTS[used + i]} pts</span>
            </li>
          ))}
      </ol>

      {state.wrong.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {state.wrong.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger">
              <X className="size-3" /> {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 min-h-10" aria-live="polite">
        {feedback && <p className={cn("animate-rise rounded-lg px-3 py-2 text-center text-sm font-semibold", feedback.ok ? "bg-grass/15 text-grass-bright" : "bg-danger/15 text-danger")}>{feedback.text}</p>}
      </div>

      {!state.finished ? (
        <div className="space-y-3">
          <PlayerSearch onSelect={onGuess} disabled={!hydrated || pending} disabledIds={state.wrong.map((p) => p.id)} placeholder="¿Quién es? Escribí un nombre…" />
          <Button variant="outline" size="sm" className="w-full" onClick={onHint} disabled={!hydrated || pending || used >= totalClues}>
            <Lightbulb className="size-4" /> Pedir otra pista ({POINTS[used] ?? 0} pts)
          </Button>
        </div>
      ) : (
        reveal && (
          <div className="card animate-rise p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flag code={reveal.player.nationality} className="h-5 w-7" />
              <span className="display text-3xl">{reveal.player.name}</span>
            </div>
            <ol className="space-y-1.5">
              {reveal.career.map((c, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <ClubBadge name={c.club} colors={c.colors} className="size-7" />
                  <span className="flex-1 font-semibold">{c.club}</span>
                  <span className="tabular text-mist">{c.years}</span>
                </li>
              ))}
            </ol>
            <Button variant="gold" className="mt-4 w-full" onClick={() => setResultOpen(true)}>
              Ver resultado
            </Button>
          </div>
        )
      )}

      <ResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title={state.won ? (used === 1 ? COPY.perfect : COPY.correct) : COPY.outOfAttempts}
        newRecord={state.newRecord}
        subtitle={reveal ? `Era ${reveal.player.name}` : undefined}
        streak={state.streak}
        isDaily={challenge.mode === "daily"}
        stats={[
          { label: "Pistas", value: `${used}/${totalClues}` },
          { label: "Tiempo", value: formatTime(elapsed) },
          { label: "Puntos", value: points },
        ]}
        share={state.share ?? ""}
        playAgainHref={playAgainHref(challenge)}
      />
    </div>
  );
}
