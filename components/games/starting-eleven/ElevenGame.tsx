"use client";

import { Heart, SkipForward, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { FootballPitch } from "@/components/pitch/FootballPitch";
import { PlayerSearch } from "@/components/player-search/PlayerSearch";
import { ResultModal } from "@/components/results/ResultModal";
import { Button } from "@/components/ui/Button";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { ProgressBar } from "@/components/ui/primitives";
import { checkElevenPick, finishEleven, revealEleven, skipElevenPrompt, startEleven } from "@/lib/actions/eleven";
import { ELEVEN_LIVES as LIVES, ELEVEN_SKIP_COUNT as SKIPS, ELEVEN_TIMERS as TIMERS } from "@/lib/game-engine/rules";
import { useElapsed } from "@/lib/client/hooks";
import { playAgainHref, useFinishGame, useGameState } from "@/lib/client/use-game-state";
import { FORMATION_NAMES, FORMATIONS, type FormationName } from "@/lib/game-engine/formations";
import { ELEVEN_VARIANTS, type ElevenPublic } from "@/lib/game-engine/games/starting-eleven";
import { canPlaySlot, POSITION_LABELS } from "@/lib/game-engine/positions";
import { COPY, resultTitle } from "@/lib/config/copy";
import { elevenShareText } from "@/lib/share";
import { cn, formatTime } from "@/lib/utils";
import type { PlayerSummary } from "@/types/football";
import type { ChallengeInfo } from "@/types/game";

interface PromptOutcome {
  prompt: number;
  outcome: "ok" | "skip";
}

interface ElevenState {
  ticket: string;
  phase: "setup" | "playing" | "finished";
  formation: FormationName;
  timer: (typeof TIMERS)[number];
  prompt: number;
  slots: (PlayerSummary | null)[];
  lives: number;
  skips: number;
  outcomes: PromptOutcome[];
  startedAt: number | null;
  finishedAt: number | null;
  streak?: number;
  share?: string;
  newRecord?: boolean;
  /** Terminó por quedarse sin vidas o sin tiempo. */
  ranOut?: boolean;
}

/** Agrupa los casilleros por línea (del arco rival al propio) para el texto de compartir. */
function lines(formation: FormationName, slots: (PlayerSummary | null)[]): boolean[][] {
  const groups = new Map<number, { x: number; ok: boolean }[]>();
  FORMATIONS[formation].forEach((s, i) => {
    const key = Math.round(s.y / 12);
    groups.set(key, [...(groups.get(key) ?? []), { x: s.x, ok: !!slots[i] }]);
  });
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, g]) => g.sort((a, b) => a.x - b.x).map((s) => s.ok));
}

export function ElevenGame({ challenge, data }: { challenge: ChallengeInfo; data: ElevenPublic }) {
  const [state, setState, hydrated] = useGameState<ElevenState>(challenge, () => ({
    ticket: challenge.ticket,
    phase: "setup",
    formation: "4-3-3",
    timer: 0,
    prompt: 0,
    slots: Array(11).fill(null),
    lives: LIVES,
    skips: SKIPS,
    outcomes: [],
    startedAt: null,
    finishedAt: null,
  }));
  const latest = useRef(state);
  const [picked, setPicked] = useState<PlayerSummary | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [examples, setExamples] = useState<Record<number, PlayerSummary[]> | null>(null);
  const [pending, startTransition] = useTransition();
  const finishGame = useFinishGame(challenge);
  const running = hydrated && state.phase === "playing";
  const elapsed = useElapsed(state.startedAt, running, state.finishedAt && state.startedAt ? state.finishedAt - state.startedAt : undefined);
  const remaining = state.timer ? Math.max(0, state.timer * 1000 - elapsed) : null;

  useEffect(() => {
    latest.current = state;
  }, [state]);

  const layout = FORMATIONS[state.formation];
  const filled = state.slots.filter(Boolean).length;
  const usedIds = state.slots.filter((s): s is PlayerSummary => !!s).map((s) => s.id);
  const freeCompatible = (p: PlayerSummary) => layout.map((s, i) => (!state.slots[i] && canPlaySlot(p.positions, s.position) ? i : -1)).filter((i) => i >= 0);
  const prompt = data.prompts[Math.min(state.prompt, data.prompts.length - 1)];

  /** Cierra la partida con un ticket ya terminado en el servidor. */
  const finish = (s: ElevenState) => {
    if (s.phase === "finished") return;
    const finishedAt = Date.now();
    const score = s.slots.filter(Boolean).length;
    const timeMs = s.startedAt ? finishedAt - s.startedAt : undefined;
    const { streak, share, newRecord } = finishGame({
      ticket: s.ticket,
      score,
      max: 11,
      win: score === 11,
      timeMs,
      share: (st) =>
        elevenShareText({
          gameName: "El 11",
          number: challenge.number,
          infinite: challenge.mode !== "daily",
          formation: s.formation,
          lines: lines(s.formation, s.slots),
          score,
          timeLabel: s.timer ? formatTime(timeMs ?? 0) : undefined,
          streak: st,
        }),
    });
    const ranOut = s.lives <= 0 || (s.timer > 0 && timeMs !== undefined && timeMs >= s.timer * 1000);
    const next: ElevenState = { ...s, phase: "finished", finishedAt, streak, share, newRecord, ranOut };
    latest.current = next;
    setState(next);
    setPicked(null);
    window.setTimeout(() => setResultOpen(true), 700);
  };

  /** Terminar por decisión propia o por tiempo: primero lo cierra el servidor. */
  const closeGame = () =>
    startTransition(async () => {
      const res = await finishEleven(challenge.token, challenge.variant, latest.current.ticket).catch(() => null);
      if (res?.ok) finish({ ...latest.current, ticket: res.ticket });
    });

  // Fin por tiempo
  useEffect(() => {
    if (running && remaining === 0) closeGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining]);

  // Ejemplos para las consignas que quedaron sin resolver
  useEffect(() => {
    if (state.phase !== "finished" || examples) return;
    const solved = new Set(state.outcomes.filter((o) => o.outcome === "ok").map((o) => o.prompt));
    const pendingPrompts = data.prompts.map((_, i) => i).filter((i) => i <= state.prompt && !solved.has(i));
    revealEleven(challenge.token, challenge.variant, state.ticket, pendingPrompts)
      .then((res) => res.ok && setExamples(res.examples))
      .catch(() => {});
  }, [state.phase, state.ticket, examples, state.outcomes, state.prompt, data.prompts, challenge.token, challenge.variant]);

  const start = () =>
    startTransition(async () => {
      const s = latest.current;
      const res = await startEleven(challenge.token, challenge.variant, s.ticket, s.formation, s.timer).catch(() => null);
      if (!res || !res.ok) {
        setFeedback({ ok: false, text: res && !res.ok ? res.error : "No pudimos arrancar la partida. Probá de nuevo." });
        return;
      }
      const next: ElevenState = { ...s, ticket: res.ticket, phase: "playing", startedAt: Date.now() };
      latest.current = next;
      setState(next);
    });

  const placeAt = (slotIndex: number, player: PlayerSummary) => {
    startTransition(async () => {
      const res = await checkElevenPick(challenge.token, challenge.variant, latest.current.ticket, player.id, slotIndex).catch(() => null);
      const cur = latest.current;
      if (cur.phase !== "playing") return;
      setPicked(null);
      if (!res || !res.ok) {
        setFeedback({ ok: false, text: res && !res.ok ? res.error : "No pudimos validar la respuesta. Probá de nuevo." });
        return;
      }
      if (res.correct) {
        const slots = [...cur.slots];
        slots[slotIndex] = player;
        const next: ElevenState = { ...cur, ticket: res.ticket, slots, prompt: cur.prompt + 1, outcomes: [...cur.outcomes, { prompt: cur.prompt, outcome: "ok" }] };
        latest.current = next;
        setFeedback({ ok: true, text: `${COPY.correct} ${player.name} de ${POSITION_LABELS[layout[slotIndex].position].toLowerCase()}.` });
        if (res.done) finish(next);
        else setState(next);
      } else {
        const next = { ...cur, ticket: res.ticket, lives: res.lives };
        latest.current = next;
        setFeedback({
          ok: false,
          text: `${res.lives <= 0 ? COPY.outOfAttempts : COPY.wrong} ${res.invalidSlot ? `${player.name} no puede jugar ahí.` : `${player.name} no cumple la consigna.`}`,
        });
        if (res.done) finish(next);
        else setState(next);
      }
    });
  };

  const onSelect = (player: PlayerSummary) => {
    const options = freeCompatible(player);
    if (options.length === 1) placeAt(options[0], player);
    else setPicked(player);
  };

  const skip = () =>
    startTransition(async () => {
      const s = latest.current;
      if (s.skips <= 0) return;
      const res = await skipElevenPrompt(challenge.token, challenge.variant, s.ticket).catch(() => null);
      if (!res || !res.ok) {
        setFeedback({ ok: false, text: res && !res.ok ? res.error : "No pudimos pasar la consigna. Probá de nuevo." });
        return;
      }
      setPicked(null);
      const next: ElevenState = { ...s, ticket: res.ticket, skips: s.skips - 1, prompt: s.prompt + 1, outcomes: [...s.outcomes, { prompt: s.prompt, outcome: "skip" }] };
      latest.current = next;
      setFeedback(null);
      if (res.done) finish(next);
      else setState(next);
    });

  if (state.phase === "setup") {
    return (
      <div className="card space-y-6 p-5 sm:p-6">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-mist">Variante</p>
          <p className="display text-3xl text-gold">{data.variantName}</p>
          <p className="text-sm text-mist">{ELEVEN_VARIANTS[data.variant].description}</p>
          {challenge.mode === "infinite" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(ELEVEN_VARIANTS).map(([id, v]) => (
                <Link
                  key={id}
                  prefetch={false}
                  href={`/juegos/el-11?modo=infinito&variante=${id}`}
                  className={cn("rounded-full border px-3 py-1 text-xs font-bold", id === data.variant ? "border-gold bg-gold/15 text-gold" : "border-line text-mist hover:text-chalk")}
                >
                  {v.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">Formación</p>
          <div className="grid grid-cols-4 gap-2">
            {FORMATION_NAMES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setState({ ...state, formation: f })}
                className={cn("rounded-xl border py-3 text-sm font-black tabular transition-colors sm:text-lg", state.formation === f ? "border-grass bg-grass/15 text-grass-bright" : "border-line hover:border-line-strong")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">Cronómetro</p>
          <div className="grid grid-cols-4 gap-2">
            {TIMERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setState({ ...state, timer: t })}
                className={cn("rounded-xl border py-2.5 text-sm font-bold transition-colors", state.timer === t ? "border-gold bg-gold/15 text-gold" : "border-line hover:border-line-strong")}
              >
                {t ? `${t} s` : "Sin tiempo"}
              </button>
            ))}
          </div>
        </div>
        <Button size="lg" className="w-full" onClick={start} disabled={!hydrated}>
          {COPY.kickoff}
        </Button>
      </div>
    );
  }

  const done = state.phase === "finished";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="flex gap-0.5" aria-label={`${state.lives} vidas`}>
            {Array.from({ length: LIVES }, (_, i) => (
              <Heart key={i} className={cn("size-5", i < state.lives ? "fill-danger text-danger" : "text-line-strong")} />
            ))}
          </span>
          <span className="text-mist">{filled}/11</span>
        </div>
        <span className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-bold", remaining !== null && remaining < 15_000 && !done ? "border-danger text-danger" : "border-line")}>
          <Timer className="size-4" aria-hidden />
          <span className="tabular">{remaining !== null ? formatTime(remaining) : formatTime(elapsed)}</span>
        </span>
      </div>
      <ProgressBar value={filled} max={11} className="mb-4" />

      {!done && (
        <div className="card mb-4 flex items-center gap-4 p-4">
          {prompt.clubId ? <ClubBadge name={prompt.label} colors={prompt.colors} className="size-14" /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mist">
              Consigna {state.outcomes.length + 1} · {prompt.qualifier ?? (prompt.clubId ? "Jugó en" : "Condición")}
            </p>
            <p className="display text-3xl leading-none sm:text-4xl" key={state.prompt}>
              {prompt.label}
            </p>
          </div>
        </div>
      )}

      {!done && (
        <div className="mb-4 space-y-2">
          {picked ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm">
              <span>
                Ubicá a <b>{picked.name}</b> en un casillero resaltado
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <PlayerSearch
              onSelect={onSelect}
              disabled={pending}
              disabledIds={usedIds}
              renderHint={(p) => (freeCompatible(p).length ? null : `No te queda lugar para un ${POSITION_LABELS[p.positions[0]].toLowerCase()}`)}
              placeholder="Buscá un jugador para esta consigna…"
            />
          )}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={skip} disabled={state.skips === 0 || pending}>
              <SkipForward className="size-4" /> Pasar ({state.skips})
            </Button>
            <Button variant="ghost" size="sm" onClick={closeGame} disabled={pending}>
              Terminar
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-10" aria-live="polite">
        {feedback && !done && (
          <p className={cn("mb-3 animate-rise rounded-lg px-3 py-2 text-center text-sm font-semibold", feedback.ok ? "bg-grass/15 text-grass-bright" : "animate-shake bg-danger/15 text-danger")}>{feedback.text}</p>
        )}
      </div>

      <FootballPitch formation={state.formation} slots={state.slots} highlight={picked ? freeCompatible(picked) : []} onSlotClick={picked ? (i) => placeAt(i, picked) : undefined} disabled={pending || done} />

      {done && (
        <div className="mt-4 space-y-3">
          {examples && Object.keys(examples).length > 0 && (
            <div className="card p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mist">Respuestas posibles que quedaron</p>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(examples).map(([i, players]) => (
                  <li key={i}>
                    <b>{data.prompts[Number(i)].label}:</b> <span className="text-mist">{players.map((p) => p.name).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="gold" className="w-full" onClick={() => setResultOpen(true)}>
            Ver resultado
          </Button>
        </div>
      )}

      <ResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title={resultTitle({ score: filled, max: 11, ranOut: state.ranOut })}
        newRecord={state.newRecord}
        subtitle={`${challenge.number ? `El 11 #${challenge.number}` : "El 11 · Modo infinito"} · ${data.variantName} · ${state.formation}`}
        streak={state.streak}
        isDaily={challenge.mode === "daily"}
        stats={[
          { label: "Resultado", value: `${filled}/11` },
          { label: "Tiempo", value: formatTime(elapsed) },
          { label: "Vidas", value: state.lives },
        ]}
        share={state.share ?? ""}
        playAgainHref={playAgainHref(challenge, challenge.variant ? `&variante=${challenge.variant}` : "")}
      />
    </div>
  );
}
