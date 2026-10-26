import "server-only";
import { getPrisma } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";
import type { GameSlug } from "@/lib/games/registry";
import { argentinaDate } from "../daily";
import { PrismaCalendarRepository } from "./prisma-repository";
import { ensureCalendar, ensureDay } from "./scheduler";

/** Corrida del cron: completa el calendario de los próximos días y repone reservas. */
export async function runDailyEngine(today = argentinaDate()) {
  const repo = new PrismaCalendarRepository();
  return ensureCalendar(repo, await getFootballIndex(), { today });
}

/**
 * Desafío diario almacenado para (juego, fecha). Si el calendario tuviera un hueco (cron caído),
 * lo genera en el momento con las mismas validaciones y lo persiste: todos reciben el mismo.
 */
export async function getStoredDaily(game: GameSlug, date: string): Promise<{ payload: unknown; number: number; source: string } | null> {
  const db = getPrisma();
  const where = { date_gameId: { date: new Date(`${date}T00:00:00Z`), gameId: game } };
  let row = await db.dailyChallenge.findUnique({ where, include: { challenge: { select: { payload: true } } } });
  if (!row) {
    await ensureDay(new PrismaCalendarRepository(), await getFootballIndex(), game, date);
    row = await db.dailyChallenge.findUnique({ where, include: { challenge: { select: { payload: true } } } });
  }
  return row ? { payload: row.challenge.payload, number: row.number, source: row.source } : null;
}

/** Marca el diario como publicado/servido la primera vez que llega a un usuario: desde ahí es inmutable. */
export async function markDailyServed(game: GameSlug, date: string) {
  const db = getPrisma();
  const d = new Date(`${date}T00:00:00Z`);
  const updated = await db.dailyChallenge.updateMany({ where: { gameId: game, date: d, firstServedAt: null }, data: { firstServedAt: new Date() } });
  if (updated.count) {
    const entry = await db.dailyChallenge.findUnique({ where: { date_gameId: { date: d, gameId: game } } });
    if (entry) await db.challenge.update({ where: { id: entry.challengeId }, data: { status: "PUBLISHED" } });
  }
}
