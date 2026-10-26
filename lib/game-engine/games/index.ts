import type { GameSlug } from "@/lib/games/registry";
import { gridEngine } from "./grid";
import { impostorEngine } from "./impostor";
import { elevenEngine } from "./starting-eleven";
import type { GameEngine } from "./types";
import { whoIsEngine } from "./who-is";

/** Motores implementados. Los juegos "próximamente" del registro todavía no tienen motor. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ENGINES: Partial<Record<GameSlug, GameEngine<any, any>>> = {
  grid: gridEngine,
  "el-11": elevenEngine,
  "quien-es": whoIsEngine,
  impostor: impostorEngine,
};

export function getEngine(slug: string) {
  return ENGINES[slug as GameSlug];
}
