import "server-only";
import { getPrisma } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";
import { DAILY_GAMES, getGame, type GameSlug } from "@/lib/games/registry";
import { describeCondition, type Condition } from "../conditions";
import { addDays, argentinaDate, challengeNumber } from "../daily";
import type { FootballIndex } from "../dataset/football-index";
import { getDailyAdapter } from "./adapters";
import { conditionKey } from "./keys";
import { PrismaCalendarRepository } from "./prisma-repository";
import { DEFAULT_SETTINGS, regenerateDay, type DailySettings } from "./scheduler";
import type { Difficulty } from "./types";
import { validateCandidate } from "./validate";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export interface CalendarCell {
  date: string;
  game: GameSlug;
  number: number;
  challengeId?: string;
  difficulty?: number;
  source?: string;
  published: boolean;
  served: boolean;
}

/** Calendario de los próximos `days` días para el panel (incluye huecos). */
export async function getCalendar(days = 30, from = argentinaDate()): Promise<{ dates: string[]; cells: Record<string, CalendarCell> }> {
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const rows = await getPrisma().dailyChallenge.findMany({ where: { date: { gte: day(dates[0]), lte: day(dates[dates.length - 1]) } } });
  const today = argentinaDate();
  const cells: Record<string, CalendarCell> = {};
  for (const date of dates) {
    for (const g of DAILY_GAMES) {
      const r = rows.find((x) => x.gameId === g.slug && iso(x.date) === date);
      cells[`${g.slug}|${date}`] = {
        date,
        game: g.slug,
        number: challengeNumber(date, g.launchDate),
        challengeId: r?.challengeId,
        difficulty: r?.difficulty,
        source: r?.source,
        published: date <= today,
        served: Boolean(r?.firstServedAt),
      };
    }
  }
  return { dates, cells };
}

export async function getAllSettings(): Promise<Record<string, DailySettings>> {
  const rows = await getPrisma().gameSettings.findMany();
  return Object.fromEntries(DAILY_GAMES.map((g) => [g.slug, { ...DEFAULT_SETTINGS, ...rows.find((r) => r.gameId === g.slug) }]));
}

export async function saveSettings(game: GameSlug, settings: DailySettings) {
  await getPrisma().gameSettings.upsert({ where: { gameId: game }, create: { gameId: game, ...settings }, update: settings });
}

function labelForKey(key: string, index: FootballIndex, conditions: Condition[]): string {
  const [kind, value] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  if (kind === "player") return `Jugador: ${index.displayName(value)}`;
  if (kind === "club") return `Club: ${index.club(value)?.name ?? value}`;
  if (kind === "competition") return `Competición: ${index.competition(value)?.name ?? value}`;
  if (kind === "cond") {
    const c = conditions.find((x) => conditionKey(x) === key);
    return `Consigna: ${c ? describeCondition(c, index) : value}`;
  }
  return key;
}

/** Detalle de un diario para revisar: consignas, respuestas verificadas, dificultad, problemas y contenido bloqueable. */
export async function getDailyDetail(game: GameSlug, date: string) {
  const db = getPrisma();
  const entry = await db.dailyChallenge.findUnique({
    where: { date_gameId: { date: day(date), gameId: game } },
    include: { challenge: { include: { conditions: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!entry) return null;
  const index = await getFootballIndex();
  const adapter = getDailyAdapter(game)!;
  const payload = entry.challenge.payload;
  const answers = await db.challengeAnswer.groupBy({ by: ["key"], where: { challengeId: entry.challengeId }, _count: { _all: true } });
  // Revalidación contra los datos actuales: detecta desafíos que quedaron inconsistentes tras editar datos.
  const blocked = await new PrismaCalendarRepository().getBlockedKeys(game);
  const check = validateCandidate(game, payload, index, { recentKeys: new Set(), blockedKeys: blocked, minDifficulty: 1, maxDifficulty: 3 });
  const conditions = entry.challenge.conditions.map((c) => c.condition as unknown as Condition);
  const keys = [...new Set([...adapter.repeatKeys(payload, index).filter((k) => k.startsWith("player:")), ...adapter.contentKeys(payload, index)])];
  return {
    entry: { ...entry, date },
    conditions: entry.challenge.conditions.map((c) => ({ key: c.key, label: c.label, answers: answers.find((a) => a.key === c.key)?._count._all ?? 0 })),
    answerCounts: answers.map((a) => ({ key: a.key, count: a._count._all })),
    problems: check.errors,
    currentDifficulty: check.difficulty,
    blockable: keys.map((key) => ({ key, label: labelForKey(key, index, conditions), blocked: blocked.has(key) })),
    published: date <= argentinaDate() || Boolean(entry.firstServedAt),
  };
}

export async function regenerate(game: GameSlug, date: string, opts: { difficulty?: Difficulty; override?: { reason: string; by: string } }) {
  return regenerateDay(new PrismaCalendarRepository(), await getFootballIndex(), game, date, { today: argentinaDate(), target: opts.difficulty, override: opts.override });
}

/** Bloquea contenido y regenera los diarios futuros (no publicados) que lo usaban. */
export async function blockContent(game: GameSlug | "*", key: string, label: string | undefined, reason: string | undefined) {
  const db = getPrisma();
  await db.blockedContent.upsert({ where: { gameId_key: { gameId: game, key } }, create: { gameId: game, key, label, reason }, update: { label, reason } });
  const index = await getFootballIndex();
  const today = argentinaDate();
  const future = await db.dailyChallenge.findMany({
    where: { date: { gt: day(today) }, firstServedAt: null, ...(game === "*" ? {} : { gameId: game }) },
    include: { challenge: { select: { payload: true } } },
  });
  const affected = future.filter((f) => {
    const adapter = getDailyAdapter(f.gameId);
    if (!adapter) return false;
    const keys = [...adapter.repeatKeys(f.challenge.payload, index), ...adapter.contentKeys(f.challenge.payload, index)];
    return keys.includes(key);
  });
  const reports = [];
  for (const f of affected) reports.push(await regenerate(f.gameId as GameSlug, iso(f.date), {}));
  await new PrismaCalendarRepository().log({ level: "INFO", event: "blocked", gameId: game === "*" ? undefined : game, message: `Bloqueado ${label ?? key}: ${affected.length} diarios futuros regenerados`, details: { key, reason } });
  return reports;
}

export async function unblockContent(id: string) {
  await getPrisma().blockedContent.delete({ where: { id } });
}

/** Publica manualmente un desafío guardado en una fecha (respeta la inmutabilidad de lo ya publicado). */
export async function publishManually(challengeId: string, date: string, override?: { reason: string; by: string }) {
  const db = getPrisma();
  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Desafío inexistente");
  const game = challenge.gameId as GameSlug;
  const adapter = getDailyAdapter(game);
  if (!adapter) throw new Error("Ese juego no participa del calendario diario");
  const repo = new PrismaCalendarRepository();
  const [entry] = await repo.getEntries(game, date, date);
  const published = date <= argentinaDate() || Boolean(entry?.firstServedAt);
  if (entry && published && !override) throw new Error("Ese día ya fue publicado: hace falta un override justificado");

  const index = await getFootballIndex();
  const check = validateCandidate(game, challenge.payload, index, { recentKeys: new Set(), blockedKeys: await repo.getBlockedKeys(game), minDifficulty: 1, maxDifficulty: 3 });
  if (!check.ok) throw new Error(`El desafío no pasa la validación: ${check.errors.join("; ")}`);
  if (entry) await repo.removeDaily(game, date);
  const meta = getGame(game)!;
  const number = challengeNumber(date, meta.launchDate);
  const status = await repo.insertDaily(
    game,
    date,
    number,
    { payload: challenge.payload, verification: check.verification!, difficulty: check.difficulty!, repeatKeys: check.repeatKeys, contentKeys: adapter.contentKeys(challenge.payload, index), fingerprint: check.fingerprint!, seed: `manual:${challengeId}` },
    "MANUAL",
  );
  await repo.log({ level: override ? "WARN" : "INFO", event: override ? "admin-override" : "manual-publish", gameId: game, date, message: `${meta.name} #${number} publicado manualmente${override ? ` (override de ${override.by}: ${override.reason})` : ""}` });
  return status;
}

export async function getRecentLogs(take = 40) {
  return getPrisma().generationLog.findMany({ orderBy: { createdAt: "desc" }, take });
}

export async function getBlockedList() {
  return getPrisma().blockedContent.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getReserveCounts(): Promise<Record<string, number>> {
  const rows = await getPrisma().challenge.groupBy({ by: ["gameId"], where: { status: "RESERVE" }, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.gameId, r._count._all]));
}
