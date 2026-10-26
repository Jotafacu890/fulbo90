import "server-only";
import { getPrisma } from "@/lib/database/prisma";
import type { GameSlug } from "@/lib/games/registry";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DEFAULT_SETTINGS, type CalendarEntry, type CalendarRepository, type Candidate, type DailySettings, type LogEntry } from "./scheduler";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const isUniqueViolation = (e: unknown) => typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
const TX = { timeout: 60_000, maxWait: 20_000 };

/** Repositorio del calendario sobre Neon/Prisma. */
export class PrismaCalendarRepository implements CalendarRepository {
  private db = getPrisma();

  async getSettings(game: GameSlug): Promise<DailySettings> {
    const row = await this.db.gameSettings.findUnique({ where: { gameId: game } });
    return row ? { ...DEFAULT_SETTINGS, ...row } : DEFAULT_SETTINGS;
  }

  async getEntries(game: GameSlug, from: string, to: string): Promise<CalendarEntry[]> {
    const rows = await this.db.dailyChallenge.findMany({ where: { gameId: game, date: { gte: day(from), lte: day(to) } }, orderBy: { date: "asc" } });
    return rows.map((r) => ({ date: iso(r.date), gameId: r.gameId as GameSlug, challengeId: r.challengeId, source: r.source, difficulty: r.difficulty, firstServedAt: r.firstServedAt }));
  }

  async getRecentKeys(game: GameSlug, from: string, to: string, excludeDate: string): Promise<Set<string>> {
    const rows = await this.db.contentUsage.findMany({
      where: { gameId: game, date: { gte: day(from), lte: day(to), not: day(excludeDate) } },
      select: { key: true },
    });
    return new Set(rows.map((r) => r.key));
  }

  async getBlockedKeys(game: GameSlug): Promise<Set<string>> {
    const rows = await this.db.blockedContent.findMany({ where: { gameId: { in: [game, "*"] } }, select: { key: true } });
    return new Set(rows.map((r) => r.key));
  }

  private challengeData(game: GameSlug, candidate: Candidate, status: "SCHEDULED" | "RESERVE", title: string) {
    return {
      gameId: game,
      title,
      mode: "DAILY" as const,
      status,
      seed: candidate.seed,
      difficulty: candidate.difficulty,
      fingerprint: candidate.fingerprint,
      payload: json(candidate.payload),
      verifiedAt: new Date(),
      conditions: {
        create: candidate.verification.conditions.map((c, i) => ({ key: c.key, label: c.label, condition: json(c.condition), sortOrder: i })),
      },
    };
  }

  private async writeCalendar(tx: Prisma.TransactionClient, game: GameSlug, date: string, number: number, challengeId: string, candidate: Candidate, source: CalendarEntry["source"]) {
    await tx.challengeAnswer.createMany({
      data: candidate.verification.answers.flatMap((a) => a.playerIds.map((playerId) => ({ challengeId, key: a.key, playerId, isCorrect: true }))),
    });
    await tx.contentUsage.createMany({ data: candidate.repeatKeys.map((key) => ({ gameId: game, date: day(date), key, challengeId })), skipDuplicates: true });
    await tx.dailyChallenge.create({ data: { date: day(date), gameId: game, challengeId, number, source, difficulty: candidate.difficulty } });
  }

  async insertDaily(game: GameSlug, date: string, number: number, candidate: Candidate, source: CalendarEntry["source"]): Promise<"created" | "exists"> {
    try {
      await this.db.$transaction(async (tx) => {
        const challenge = await tx.challenge.create({ data: this.challengeData(game, candidate, "SCHEDULED", `#${number}`) });
        await this.writeCalendar(tx, game, date, number, challenge.id, candidate, source);
      }, TX);
      return "created";
    } catch (e) {
      // Otra ejecución del cron llegó primero: la transacción se revierte entera.
      if (isUniqueViolation(e)) return "exists";
      throw e;
    }
  }

  async removeDaily(game: GameSlug, date: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const entry = await tx.dailyChallenge.findUnique({ where: { date_gameId: { date: day(date), gameId: game } } });
      if (!entry) return;
      await tx.dailyChallenge.delete({ where: { id: entry.id } });
      await tx.contentUsage.deleteMany({ where: { gameId: game, date: day(date) } });
      await tx.challenge.update({ where: { id: entry.challengeId }, data: { status: "ARCHIVED" } });
    }, TX);
  }

  async listReserves(game: GameSlug) {
    const rows = await this.db.challenge.findMany({ where: { gameId: game, status: "RESERVE" }, orderBy: { createdAt: "asc" }, select: { id: true, payload: true } });
    return rows;
  }

  async insertReserve(game: GameSlug, candidate: Candidate): Promise<void> {
    await this.db.challenge.create({ data: this.challengeData(game, candidate, "RESERVE", "Reserva") });
  }

  async assignReserve(reserveId: string, game: GameSlug, date: string, number: number, candidate: Candidate): Promise<"created" | "exists"> {
    try {
      await this.db.$transaction(async (tx) => {
        // Consumir la reserva sólo si sigue disponible (dos crons no pueden tomar la misma).
        const taken = await tx.challenge.updateMany({ where: { id: reserveId, status: "RESERVE" }, data: { status: "SCHEDULED", title: `#${number} (reserva)` } });
        if (taken.count === 0) throw Object.assign(new Error("Reserva ya usada"), { code: "P2002" });
        await this.writeCalendar(tx, game, date, number, reserveId, candidate, "RESERVE");
      }, TX);
      return "created";
    } catch (e) {
      if (isUniqueViolation(e)) return "exists";
      throw e;
    }
  }

  async log(entry: LogEntry): Promise<void> {
    await this.db.generationLog.create({
      data: { level: entry.level, event: entry.event, gameId: entry.gameId, date: entry.date ? day(entry.date) : undefined, message: entry.message, details: entry.details === undefined ? undefined : json(entry.details) },
    });
  }
}
