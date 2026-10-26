"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { argentinaDate, msUntilNextDaily } from "@/lib/game-engine/daily";
import { subscribeStorage } from "./storage";

const subscribeNoop = () => () => {};

/** true sólo en el cliente (evita desajustes de hidratación con datos de localStorage). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Lee localStorage reactivamente. `read` debe devolver un valor serializable estable (se compara por JSON). */
export function useStorageValue<T>(read: () => T, fallback: T): T {
  const json = useSyncExternalStore(
    subscribeStorage,
    () => JSON.stringify(read()),
    () => JSON.stringify(fallback),
  );
  return JSON.parse(json) as T;
}

/** Fecha actual en Argentina; se actualiza al cruzar la medianoche. */
export function useArgentinaToday(): string | null {
  const mounted = useMounted();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const tick = () => setToday(argentinaDate());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [mounted]);
  return today;
}

export function useCountdownToNextDaily(): number | null {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilNextDaily());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return ms;
}

/** Cronómetro: tiempo transcurrido desde `startedAt` mientras `running`. */
export function useElapsed(startedAt: number | null, running: boolean, frozenMs?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);
  if (frozenMs !== undefined) return frozenMs;
  if (!startedAt) return 0;
  return Math.max(0, now - startedAt);
}
