"use client";

import { Flag as FlagIcon, Timer } from "lucide-react";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { PlayerSearch } from "@/components/player-search/PlayerSearch";
import { ResultModal } from "@/components/results/ResultModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge, ProgressBar } from "@/components/ui/primitives";
import { finishGrid, guessGridCell, revealGrid } from "@/lib/actions/grid";
import { useElapsed } from "@/lib/client/hooks";
import { playAgainHref, useFinishGame, useGameState } from "@/lib/client/use-game-state";
import type { GridPublic } from "@/lib/game-engine/games/grid";
import { rarityScore } from "@/lib/game-engine/rarity";
import { GRID_MAX_ATTEMPTS } from "@/lib/game-engine/rules";
import { COPY, resultTitle } from "@/lib/config/copy";
import { gridShareText, type GridCellResult } from "@/lib/share";
import { cn, formatTime } from "@/lib/utils";
import type { PlayerSummary } from "@/types/football";
import type { ChallengeInfo } from "@/types/game";
import { AxisHeader } from "./AxisHeader";

interface FilledCell {
  player: PlayerSummary;
  rarity: number;
}

interface GridState {
  /** Ticket firmado: el servidor lleva intentos, celdas y jugadores usados. */
  ticket: string;
  cells: (FilledCell | null)[];
  attempts: number;
  startedAt: number | null;
  finishedAt: number | null;
  finished: boolean;
  /** Celdas donde hubo al menos un error (en el texto para compartir salen en amarillo si después se acertaron). */
  misses: number[];
  streak?: number;
  share?: string;
  newRecord?: boolean;
}

type Reveal = { count: number; examples: PlayerSummary[] }[][];

export function GridGame({ challenge, grid }: { challenge: ChallengeInfo; grid: GridPublic }) {
  const [state, setState, hydrated] = useGameState<GridState>(challenge, () => ({
    ticket: challenge.ticket,
    cells: Array(9).fill(null),
    attempts: 0,
    startedAt: null,
    finishedAt: null,
    finished: false,
    misses: [],
  }));
  const latest = useRef(state);
  const [active, setActive] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ cell: number; ok: boolean; message: string } | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [pending, startTransition] = useTransition();
  const finishGame = useFinishGame(challenge);
  const elapsed = useElapsed(state.startedAt, hydrated && !state.finished, state.finishedAt && state.startedAt ? state.finishedAt - state.startedAt : undefined);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  const filled = state.cells.filter(Boolean).length;
  const usedIds = state.cells.filter((c): c is FilledCell => !!c).map((c) => c.player.id);
  const attemptsLeft = GRID_MAX_ATTEMPTS - state.attempts;
  const rarity = rarityScore(state.cells.map((c) => c?.rarity ?? null));

  // Al terminar, traer ejemplos de respuestas para cada celda vacía (el servidor sólo las da con la partida cerrada).
  useEffect(() => {
    if (state.finished && !reveal) {
      revealGrid(challenge.token, state.ticket)
        .then((res) => res.ok && setReveal(res.cells))
        .catch(() => {});
    }
  }, [state.finished, state.ticket, reveal, challenge.token]);

  const finish = (s: GridState) => {
    const finishedAt = Date.now();
    const score = s.cells.filter(Boolean).length;
    const r = rarityScore(s.cells.map((c) => c?.rarity ?? null));
    const { streak, share, newRecord } = finishGame({
      ticket: s.ticket,
      score,
      max: 9,
      win: score === 9,
      timeMs: s.startedAt ? finishedAt - s.startedAt : undefined,
      rarity: r,
      share: (streakValue) =>
        gridShareText({
          gameName: "Grid",
          number: challenge.number,
          infinite: challenge.mode !== "daily",
          cells: [0, 1, 2].map((row) =>
            [0, 1, 2].map((col): GridCellResult => {
              const idx = row * 3 + col;
              return !s.cells[idx] ? "miss" : s.misses.includes(idx) ? "late" : "ok";
            }),
          ),
          score,
          rarity: r,
          streak: streakValue,
        }),
    });
    const next = { ...s, finished: true, finishedAt, streak, share, newRecord };
    latest.current = next;
    setState(next);
    window.setTimeout(() => setResultOpen(true), 700);
  };

  /** "Terminar" antes de tiempo: el servidor cierra el ticket. */
  const giveUp = () =>
    startTransition(async () => {
      const res = await finishGrid(challenge.token, latest.current.ticket);
      if (res.ok) finish({ ...latest.current, ticket: res.ticket });
    });

  const onPick = (player: PlayerSummary) => {
    if (active === null) return;
    const cell = active;
    setActive(null);
    startTransition(async () => {
      const prev = latest.current;
      const res = await guessGridCell(challenge.token, prev.ticket, Math.floor(cell / 3), cell % 3, player.id).catch(() => null);
      if (!res || !res.ok) {
        // Regla rota o error de red: no consume intento.
        setFlash({ cell, ok: false, message: res && !res.ok ? res.error : "No pudimos validar la respuesta. Probá de nuevo." });
        return;
      }
      const cells = [...prev.cells];
      if (res.correct) cells[cell] = { player: res.player, rarity: res.rarity ?? 100 };
      const misses = res.correct || prev.misses.includes(cell) ? prev.misses : [...prev.misses, cell];
      const next: GridState = { ...prev, ticket: res.ticket, cells, misses, startedAt: prev.startedAt ?? Date.now(), attempts: GRID_MAX_ATTEMPTS - res.attemptsLeft };
      latest.current = next;
      if (res.done) finish(next);
      else setState(next);
      setFlash({
        cell,
        ok: res.correct,
        message: res.correct
          ? `${COPY.correct} ${res.player.name} · elegido por el ${res.rarity}%`
          : res.attemptsLeft === 0
            ? `${COPY.outOfAttempts} ${res.player.name} no cumple las dos condiciones`
            : `${COPY.wrong} ${res.player.name} no cumple las dos condiciones`,
      });
      window.setTimeout(() => setFlash((f) => (f?.cell === cell ? null : f)), 2600);
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1.5 flex justify-between text-xs font-bold uppercase tracking-wider text-mist">
            <span>{filled}/9 celdas</span>
            <span className={cn(attemptsLeft <= 3 && !state.finished && "text-danger")}>{attemptsLeft} intentos</span>
          </div>
          <ProgressBar value={filled} max={9} />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm font-bold">
          <Timer className="size-4 text-mist" aria-hidden />
          <span className="tabular">{formatTime(elapsed)}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,0.9fr)_repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line p-1 text-center">
          <span className="display tabular text-3xl text-gold">{rarity}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-mist sm:text-[10px]">Rareza</span>
        </div>
        {grid.cols.map((c, i) => (
          <div key={i} className="min-h-20 py-1 sm:min-h-24">
            <AxisHeader axis={c} orientation="col" />
          </div>
        ))}
        {grid.rows.map((r, row) => (
          <Fragment key={row}>
            <div className="flex items-center justify-center">
              <AxisHeader axis={r} orientation="row" />
            </div>
            {[0, 1, 2].map((col) => {
              const idx = row * 3 + col;
              const cell = state.cells[idx];
              const shaking = flash?.cell === idx && !flash.ok;
              const example = reveal?.[row]?.[col];
              return (
                <button
                  key={col}
                  type="button"
                  disabled={!hydrated || !!cell || state.finished || pending}
                  onClick={() => setActive(idx)}
                  aria-label={`${r.label} y ${grid.cols[col].label}${cell ? `: ${cell.player.name}` : ""}`}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border p-1.5 text-center transition-colors",
                    cell
                      ? "animate-pop border-grass/60 bg-gradient-to-b from-grass/30 to-grass/10"
                      : state.finished
                        ? "border-danger/30 bg-danger/5"
                        : "border-line bg-pitch/60 hover:border-grass hover:bg-pitch-2 active:scale-95",
                    shaking && "animate-shake border-danger bg-danger/20",
                  )}
                >
                  {cell ? (
                    <>
                      <span className="line-clamp-2 text-[11px] font-extrabold leading-tight sm:text-sm">{cell.player.name}</span>
                      <span className="tabular mt-1 rounded-full bg-night/70 px-1.5 py-0.5 text-[10px] font-bold text-gold">{cell.rarity}%</span>
                    </>
                  ) : state.finished && example ? (
                    <span className="text-[10px] leading-tight text-mist">
                      <span className="block font-bold text-chalk/80">{example.examples[0]?.name}</span>
                      {example.count > 1 && <span>+{example.count - 1} más</span>}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-mist-2 sm:text-xs">{grid.answerCounts[row][col]} posibles</span>
                  )}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="mt-3 min-h-10" aria-live="polite">
        {flash && (
          <p className={cn("animate-rise rounded-lg px-3 py-2 text-center text-sm font-semibold", flash.ok ? "bg-grass/15 text-grass-bright" : "bg-danger/15 text-danger")}>{flash.message}</p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {state.finished ? (
          <Button variant="gold" onClick={() => setResultOpen(true)}>
            Ver resultado
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled={!hydrated || state.attempts === 0 || pending} onClick={giveUp}>
            <FlagIcon className="size-4" /> Terminar
          </Button>
        )}
      </div>

      <Modal open={active !== null} onClose={() => setActive(null)} title="Elegí un jugador">
        {active !== null && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone="grass">{grid.rows[Math.floor(active / 3)].label}</Badge>
              <span className="text-mist">+</span>
              <Badge tone="gold">{grid.cols[active % 3].label}</Badge>
            </div>
            <PlayerSearch autoFocus onSelect={onPick} disabledIds={usedIds} placeholder="Buscá un futbolista…" />
            <p className="mt-3 text-xs text-mist">Te quedan {attemptsLeft} intentos. Un error gasta uno.</p>
          </>
        )}
      </Modal>

      <ResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title={resultTitle({ score: filled, max: 9, ranOut: state.attempts >= GRID_MAX_ATTEMPTS })}
        newRecord={state.newRecord}
        subtitle={challenge.number ? `Grid Sudamericano #${challenge.number}` : "Grid Sudamericano · Modo infinito"}
        streak={state.streak}
        isDaily={challenge.mode === "daily"}
        stats={[
          { label: "Resultado", value: `${filled}/9` },
          { label: "Tiempo", value: formatTime(elapsed) },
          { label: "Rareza", value: rarity, hint: "menor es mejor" },
        ]}
        share={state.share ?? ""}
        playAgainHref={playAgainHref(challenge)}
      />
    </div>
  );
}
