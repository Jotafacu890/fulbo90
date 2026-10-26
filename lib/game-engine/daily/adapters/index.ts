import type { GameSlug } from "@/lib/games/registry";
import type { DailyAdapter } from "../types";
import { elevenDaily } from "./eleven";
import { gridDaily } from "./grid";
import { impostorDaily } from "./impostor";
import { whoIsDaily } from "./who-is";

/** Juegos que participan del calendario diario. Un modo nuevo se suma registrando su adaptador. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DAILY_ADAPTERS: Partial<Record<GameSlug, DailyAdapter<any>>> = {
  grid: gridDaily,
  "el-11": elevenDaily,
  "quien-es": whoIsDaily,
  impostor: impostorDaily,
};

export function getDailyAdapter(game: string) {
  return DAILY_ADAPTERS[game as GameSlug];
}
