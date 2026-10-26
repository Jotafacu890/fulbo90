"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { ResultModal } from "@/components/results/ResultModal";
import { Button } from "@/components/ui/Button";
import { Flag } from "@/components/ui/Flag";
import { answerImpostor } from "@/lib/actions/impostor";
import { useElapsed } from "@/lib/client/hooks";
import { playAgainHref, useFinishGame, useGameState } from "@/lib/client/use-game-state";
import type { ImpostorPublic } from "@/lib/game-engine/games/impostor";
import { POSITION_LABELS } from "@/lib/game-engine/positions";
import { COPY, resultTitle } from "@/lib/config/copy";
import { impostorShareText } from "@/lib/share";
import { cn, formatTime } from "@/lib/utils";
import type { ChallengeInfo } from "@/types/game";

interface RoundAnswer {
  correct: boolean;
  impostorId: string;
  explanation: string;
  members: string[];
  picked: string;
}

interface ImpostorState {
  ticket: string;
  round: number;
  answers: RoundAnswer[];
  finished: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  streak?: number;
  share?: string;
  newRecord?: boolean;
}

export function ImpostorGame({ challenge, data }: { challenge: ChallengeInfo; data: ImpostorPublic }) {
  const total = data.rounds.length;
  const [state, setState, hydrated] = useGameState<ImpostorState>(challenge, () => ({ ticket: challenge.ticket, round: 0, answers: [], finished: false, startedAt: null, finishedAt: null }));
  const latest = useRef(state);
  const [pending, startTransition] = useTransition();
  const [resultOpen, setResultOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishGame = useFinishGame(challenge);
  const elapsed = useElapsed(state.startedAt, hydrated && !state.finished, state.finishedAt && state.startedAt ? state.finishedAt - state.startedAt : undefined);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  const roundIndex = Math.min(state.round, total - 1);
  const round = data.rounds[roundIndex];
  const answer = state.answers[roundIndex];
  const correctCount = state.answers.filter((a) => a.correct).length;

  const pick = (playerId: string) => {
    if (answer || pending) return;
    startTransition(async () => {
      const prev = latest.current;
      const res = await answerImpostor(challenge.token, prev.ticket, roundIndex, playerId).catch(() => null);
      if (!res || !res.ok) {
        setError(res && !res.ok ? res.error : "No pudimos validar la respuesta. Probá de nuevo.");
        return;
      }
      setError(null);
      const answerData: RoundAnswer = { correct: res.correct, impostorId: res.impostorId, explanation: res.explanation, members: res.members, picked: playerId };
      const next = { ...prev, ticket: res.ticket, startedAt: prev.startedAt ?? Date.now(), answers: [...prev.answers, answerData] };
      latest.current = next;
      setState(next);
    });
  };

  const advance = () => {
    const s = latest.current;
    if (s.round + 1 < total) {
      setState({ ...s, round: s.round + 1 });
      return;
    }
    const finishedAt = Date.now();
    const results = s.answers.map((a) => a.correct);
    const score = results.filter(Boolean).length;
    const { streak, share, newRecord } = finishGame({
      ticket: s.ticket,
      score,
      max: total,
      win: score >= Math.ceil(total * 0.6),
      timeMs: s.startedAt ? finishedAt - s.startedAt : undefined,
      share: (st) => impostorShareText({ gameName: "Impostor", number: challenge.number, infinite: challenge.mode !== "daily", results, streak: st }),
    });
    setState({ ...s, finished: true, finishedAt, streak, share, newRecord });
    setResultOpen(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {data.rounds.map((_, i) => {
            const a = state.answers[i];
            return (
              <span
                key={i}
                className={cn(
                  "grid size-8 place-items-center rounded-lg border text-xs font-black",
                  a ? (a.correct ? "border-grass bg-grass/20 text-grass-bright" : "border-danger bg-danger/20 text-danger") : i === roundIndex ? "border-gold text-gold" : "border-line text-mist-2",
                )}
              >
                {a ? a.correct ? <Check className="size-4" /> : <X className="size-4" /> : i + 1}
              </span>
            );
          })}
        </div>
        <span className="tabular rounded-lg border border-line px-2.5 py-1.5 text-sm font-bold">{formatTime(elapsed)}</span>
      </div>

      <div key={roundIndex} className="animate-rise">
        <p className="mb-4 text-xl font-extrabold leading-snug sm:text-2xl">{round.prompt}</p>
        <div className="grid gap-2">
          {round.options.map((p) => {
            const isImpostor = answer?.impostorId === p.id;
            const isPicked = answer?.picked === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!hydrated || !!answer || pending}
                onClick={() => pick(p.id)}
                className={cn(
                  "card flex items-center gap-3 px-4 py-3.5 text-left transition-all",
                  !answer && "hover:border-gold hover:bg-pitch-2 active:scale-[0.99]",
                  answer && isImpostor && "animate-pop border-gold bg-gold/15",
                  answer && isPicked && !isImpostor && "animate-shake border-danger bg-danger/15",
                  answer && !isImpostor && !isPicked && "opacity-60",
                )}
              >
                <Flag code={p.nationality} className="h-4 w-6" />
                <span className="flex-1">
                  <span className="block text-lg font-bold leading-tight">{p.name}</span>
                  <span className="text-xs text-mist">{POSITION_LABELS[p.positions[0]]}</span>
                </span>
                {answer && isImpostor && <span className="text-xs font-black uppercase tracking-wider text-gold">Impostor</span>}
              </button>
            );
          })}
        </div>

        {error && <p className="mt-3 rounded-lg bg-danger/15 px-3 py-2 text-center text-sm font-semibold text-danger">{error}</p>}

        {answer && (
          <div className={cn("mt-4 animate-rise rounded-xl border p-4", answer.correct ? "border-grass/40 bg-grass/10" : "border-danger/40 bg-danger/10")}>
            <p className={cn("display text-2xl", answer.correct ? "text-grass-bright" : "text-danger")}>{answer.correct ? COPY.correct : COPY.wrong}</p>
            <p className="mt-1 font-semibold">{answer.explanation}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-mist">
              {answer.members.map((m) => (
                <li key={m}>· {m}</li>
              ))}
            </ul>
            {!state.finished ? (
              <Button className="mt-4 w-full" onClick={advance}>
                {state.round + 1 < total ? "Siguiente ronda" : "Ver resultado"} <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button variant="gold" className="mt-4 w-full" onClick={() => setResultOpen(true)}>
                Ver resultado
              </Button>
            )}
          </div>
        )}
      </div>

      <ResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title={resultTitle({ score: correctCount, max: total })}
        newRecord={state.newRecord}
        subtitle={challenge.number ? `Impostor #${challenge.number}` : "Impostor · Modo infinito"}
        streak={state.streak}
        isDaily={challenge.mode === "daily"}
        stats={[
          { label: "Aciertos", value: `${correctCount}/${total}` },
          { label: "Tiempo", value: formatTime(elapsed) },
          { label: "Precisión", value: `${Math.round((correctCount / total) * 100)}%` },
        ]}
        share={state.share ?? ""}
        playAgainHref={playAgainHref(challenge)}
      />
    </div>
  );
}
