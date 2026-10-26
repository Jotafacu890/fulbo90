import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStaticDataset } from "@/data";
import { DAILY_ADAPTERS } from "@/lib/game-engine/daily/adapters";
import { DEFAULT_SETTINGS, ensureCalendar } from "@/lib/game-engine/daily/scheduler";
import { FootballIndex } from "@/lib/game-engine/dataset/football-index";
import type { GameSlug } from "@/lib/games/registry";
import { MemoryCalendarRepository } from "../helpers/memory-repository";

const index = new FootballIndex(buildStaticDataset());

/**
 * El motor tiene que poder funcionar meses sin carga manual: con los datos actuales, 90 días
 * seguidos se generan respetando todas las validaciones (sin reservas ni modo relajado).
 */
describe("sostenibilidad del calendario", () => {
  for (const game of Object.keys(DAILY_ADAPTERS) as GameSlug[]) {
    it(`${game}: 90 días sin repetir ni relajar validaciones`, async () => {
      const repo = new MemoryCalendarRepository();
      repo.settings[game] = { ...DEFAULT_SETTINGS, horizonDays: 90, reserveSize: 0 };
      const { days } = await ensureCalendar(repo, index, { today: "2026-11-01", games: [game] });
      const degraded = days.filter((d) => d.status !== "created");
      assert.equal(degraded.length, 0, `${degraded.length} días degradados, primero: ${JSON.stringify(degraded[0])}`);
    });
  }
});
