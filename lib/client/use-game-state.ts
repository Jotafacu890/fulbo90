"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitResult } from "@/lib/actions/results";
import { readJSON, writeJSON } from "@/lib/client/storage";
import { argentinaDate } from "@/lib/game-engine/daily";
import { effectiveStreak, localStats, type GameResultInput } from "@/lib/stats/local-stats";
import type { ChallengeInfo } from "@/types/game";

/**
 * Estado de una partida persistido en localStorage por desafío: si el usuario recarga la página
 * a mitad del Grid diario, sigue donde estaba (y no puede "reintentar" el diario).
 */
export function useGameState<T extends object>(challenge: ChallengeInfo, initial: () => T) {
  const storageKey = `game:${challenge.key}`;
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    if (loadedKey.current === storageKey) return;
    loadedKey.current = storageKey;
    const saved = readJSON<T>(storageKey);
    // Hidratar desde localStorage sólo puede ocurrir en el cliente.
    setState(saved ? { ...initial(), ...saved } : initial());
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (hydrated) writeJSON(storageKey, state);
  }, [hydrated, state, storageKey]);

  return [state, setState, hydrated] as const;
}

/**
 * Registra el final de la partida. Estadísticas locales siempre (invitados y usuarios);
 * con sesión iniciada además se guarda en Neon a partir del ticket firmado.
 */
export function useFinishGame(challenge: ChallengeInfo) {
  return useCallback(
    (result: Omit<GameResultInput, "game" | "mode" | "date" | "isToday"> & { ticket: string }) => {
      const isToday = challenge.mode === "daily" && challenge.date === argentinaDate();
      const { ticket, ...local } = result;
      const { stats, share, newRecord } = localStats.record({ ...local, game: challenge.game, mode: challenge.mode, date: challenge.date, isToday });
      if (challenge.loggedIn) {
        submitResult({ game: challenge.game, token: challenge.token, ticket, variant: challenge.variant, timeMs: result.timeMs }).catch(() => {});
      }
      const streak = challenge.mode === "daily" && challenge.date ? effectiveStreak(stats, challenge.date) : 0;
      return { streak, share, newRecord };
    },
    [challenge],
  );
}

/** URL para "Jugar de nuevo": el servidor asigna un seed nuevo del modo infinito y redirige. */
export function playAgainHref(challenge: ChallengeInfo, extra = ""): string {
  return `/juegos/${challenge.game}?modo=infinito${extra}`;
}
