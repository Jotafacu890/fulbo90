/**
 * Corre el Daily Challenge Engine a mano (lo mismo que hace el cron diario).
 *   npm run daily:generate                     # completa el calendario (30 días) y las reservas
 *   npm run daily:generate -- --from 2026-11-01
 *   npm run daily:generate -- --backfill       # además registra el historial de diarios viejos sin historial
 */
import "dotenv/config";
import { getPrisma } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";
import { getDailyAdapter } from "@/lib/game-engine/daily/adapters";
import { runDailyEngine } from "@/lib/game-engine/daily/service";
import type { GameSlug } from "@/lib/games/registry";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Diarios creados antes del motor (sin ContentUsage): se les calcula el historial y la dificultad. */
async function backfill() {
  const db = getPrisma();
  const index = await getFootballIndex();
  const entries = await db.dailyChallenge.findMany({ include: { challenge: true } });
  let n = 0;
  for (const e of entries) {
    const adapter = getDailyAdapter(e.gameId);
    if (!adapter) continue;
    const has = await db.contentUsage.count({ where: { gameId: e.gameId, date: e.date } });
    if (has) continue;
    try {
      const verification = adapter.verify(e.challenge.payload, index);
      const difficulty = adapter.difficulty(e.challenge.payload, index, verification);
      const keys = adapter.repeatKeys(e.challenge.payload, index);
      await db.contentUsage.createMany({ data: keys.map((key) => ({ gameId: e.gameId, date: e.date, key, challengeId: e.challengeId })), skipDuplicates: true });
      await db.dailyChallenge.update({ where: { id: e.id }, data: { difficulty, ...(e.challenge.mode === "CURATED" ? { source: "MANUAL" as const } : {}) } });
      n++;
    } catch (err) {
      console.warn(`No se pudo completar historial de ${e.gameId} ${e.date.toISOString().slice(0, 10)}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Historial completado para ${n} diarios`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  if (process.argv.includes("--backfill")) await backfill();
  const { days, reserves } = await runDailyEngine(arg("from"));
  const games = [...new Set(days.map((d) => d.game))] as GameSlug[];
  for (const game of games) {
    const mine = days.filter((d) => d.game === game);
    const count = (s: string) => mine.filter((d) => d.status === s).length;
    console.log(`${game.padEnd(9)} existentes ${count("exists")} · nuevos ${count("created")} · reserva ${count("fallback")} · relajados ${count("relaxed")} · fallidos ${count("failed")} · reservas nuevas ${reserves[game] ?? 0}`);
    for (const d of mine.filter((x) => x.status === "failed")) console.log(`   ✖ ${d.date}: ${d.errors?.join("; ")}`);
  }
  process.exit(days.some((d) => d.status === "failed") ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
