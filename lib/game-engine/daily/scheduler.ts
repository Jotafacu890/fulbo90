import { DAILY_GAMES, getGame, type GameSlug } from "@/lib/games/registry";
import { addDays, challengeNumber } from "../daily";
import type { FootballIndex } from "../dataset/football-index";
import { getEngine } from "../games";
import { createRng } from "../rng";
import { getDailyAdapter } from "./adapters";
import { isSoftKey } from "./keys";
import type { Difficulty, ValidationContext, Verification } from "./types";
import { validateCandidate } from "./validate";

/**
 * Daily Challenge Engine. Mantiene precargado el calendario (fecha × juego) para los próximos días,
 * genera con datos verificables, valida antes de publicar, evita repeticiones, usa reservas si algo
 * falla y es idempotente: la unicidad (fecha, juego) en la base impide duplicados aunque el cron
 * corra dos veces en paralelo.
 *
 * No conoce Prisma: trabaja contra CalendarRepository (Neon en producción, memoria en los tests).
 */

export interface DailySettings {
  /** Días sin repetir un desafío exacto (misma grilla, mismo jugador de ¿Quién es?…). */
  repeatWindowDays: number;
  /** Días sin repetir contenido parcial (un cruce del Grid, un impostor…). */
  softRepeatDays: number;
  minDifficulty: number;
  maxDifficulty: number;
  targetDifficulty: number;
  horizonDays: number;
  reserveSize: number;
}

export const DEFAULT_SETTINGS: DailySettings = {
  repeatWindowDays: 30,
  softRepeatDays: 7,
  minDifficulty: 1,
  maxDifficulty: 3,
  targetDifficulty: 2,
  horizonDays: 30,
  reserveSize: 5,
};

export interface Candidate {
  payload: unknown;
  verification: Verification;
  difficulty: Difficulty;
  repeatKeys: string[];
  contentKeys: string[];
  fingerprint: string;
  seed: string;
}

export interface CalendarEntry {
  date: string;
  gameId: GameSlug;
  challengeId: string;
  source: "GENERATED" | "RESERVE" | "MANUAL";
  difficulty: number;
  firstServedAt: Date | null;
}

export interface LogEntry {
  level: "INFO" | "WARN" | "ERROR";
  event: string;
  gameId?: string;
  date?: string;
  message: string;
  details?: unknown;
}

export interface CalendarRepository {
  getSettings(game: GameSlug): Promise<DailySettings>;
  getEntries(game: GameSlug, from: string, to: string): Promise<CalendarEntry[]>;
  /** Claves de repetición usadas entre `from` y `to`, sin contar `excludeDate`. */
  getRecentKeys(game: GameSlug, from: string, to: string, excludeDate: string): Promise<Set<string>>;
  getBlockedKeys(game: GameSlug): Promise<Set<string>>;
  /** Inserta atómicamente el desafío + respuestas + historial + calendario. "exists" si otro proceso ganó. */
  insertDaily(game: GameSlug, date: string, number: number, candidate: Candidate, source: CalendarEntry["source"]): Promise<"created" | "exists">;
  /** Saca un día del calendario (sólo para regenerar días no publicados o con override administrativo). */
  removeDaily(game: GameSlug, date: string): Promise<void>;
  listReserves(game: GameSlug): Promise<{ id: string; payload: unknown }[]>;
  insertReserve(game: GameSlug, candidate: Candidate): Promise<void>;
  /** Asigna una reserva a una fecha (y la consume). */
  assignReserve(reserveId: string, game: GameSlug, date: string, number: number, candidate: Candidate): Promise<"created" | "exists">;
  log(entry: LogEntry): Promise<void>;
}

export interface DayReport {
  game: GameSlug;
  date: string;
  status: "exists" | "created" | "fallback" | "relaxed" | "failed";
  difficulty?: number;
  attempts?: number;
  errors?: string[];
}

const MAX_ATTEMPTS = 80;

function toCandidate(game: GameSlug, payload: unknown, index: FootballIndex, ctx: ValidationContext, seed: string): { candidate?: Candidate; errors: string[] } {
  const result = validateCandidate(game, payload, index, ctx);
  if (!result.ok) return { errors: result.errors };
  return {
    errors: [],
    candidate: {
      payload,
      verification: result.verification!,
      difficulty: result.difficulty!,
      repeatKeys: result.repeatKeys,
      contentKeys: getDailyAdapter(game)!.contentKeys(payload, index),
      fingerprint: result.fingerprint!,
      seed,
    },
  };
}

/**
 * Genera candidatos con seeds derivados de la fecha hasta encontrar uno válido. Prefiere la
 * dificultad objetivo; si no aparece, se queda con el primer válido dentro del rango.
 */
export function findCandidate(
  game: GameSlug,
  date: string,
  index: FootballIndex,
  ctx: ValidationContext,
  { target, seedBase = `${game}:daily:${date}`, maxAttempts = MAX_ATTEMPTS }: { target?: number; seedBase?: string; maxAttempts?: number } = {},
): { candidate: Candidate | null; attempts: number; errors: string[] } {
  const engine = getEngine(game);
  if (!engine) return { candidate: null, attempts: 0, errors: ["Juego sin motor"] };
  let fallback: Candidate | null = null;
  const errors = new Set<string>();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // El intento 0 usa el mismo seed que el modo sin base de datos: mismo desafío en ambos casos.
    const seed = attempt === 0 ? seedBase : `${seedBase}#${attempt}`;
    let payload: unknown;
    try {
      payload = engine.generate(index, createRng(seed), { kind: "daily", date });
    } catch (e) {
      errors.add(e instanceof Error ? e.message : String(e));
      continue;
    }
    const { candidate, errors: errs } = toCandidate(game, payload, index, ctx, seed);
    errs.forEach((e) => errors.add(e));
    if (!candidate) continue;
    if (target === undefined || candidate.difficulty === target) return { candidate, attempts: attempt + 1, errors: [] };
    fallback ??= candidate;
  }
  return { candidate: fallback, attempts: maxAttempts, errors: [...errors].slice(0, 5) };
}

async function contextFor(repo: CalendarRepository, game: GameSlug, date: string, settings: DailySettings, overrides: Partial<ValidationContext> = {}): Promise<ValidationContext> {
  const w = settings.repeatWindowDays;
  const sw = settings.softRepeatDays;
  const long = w > 0 ? await repo.getRecentKeys(game, addDays(date, -w), addDays(date, w), date) : new Set<string>();
  const short = sw > 0 ? await repo.getRecentKeys(game, addDays(date, -sw), addDays(date, sw), date) : new Set<string>();
  return {
    recentKeys: new Set([...long].filter((k) => !isSoftKey(k))),
    softRecentKeys: new Set([...short].filter(isSoftKey)),
    blockedKeys: await repo.getBlockedKeys(game),
    minDifficulty: settings.minDifficulty,
    maxDifficulty: settings.maxDifficulty,
    ...overrides,
  };
}

/** Garantiza que exista el desafío de (juego, fecha). Idempotente. */
export async function ensureDay(
  repo: CalendarRepository,
  index: FootballIndex,
  game: GameSlug,
  date: string,
  {
    target,
    settings,
    salt,
    find = findCandidate,
  }: {
    target?: Difficulty;
    settings?: DailySettings;
    /** Cambia los seeds (para regenerar sin obtener el mismo desafío). */
    salt?: string;
    /** Inyectable en tests para simular fallas del generador. */
    find?: typeof findCandidate;
  } = {},
): Promise<DayReport> {
  const [existing] = await repo.getEntries(game, date, date);
  if (existing) return { game, date, status: "exists", difficulty: existing.difficulty };

  const meta = getGame(game)!;
  const number = challengeNumber(date, meta.launchDate);
  const s = settings ?? (await repo.getSettings(game));
  const ctx = await contextFor(repo, game, date, s, target ? { minDifficulty: target, maxDifficulty: target } : {});

  // 1) Generación normal con todas las validaciones.
  const seedBase = `${game}:daily:${date}${salt ? `:${salt}` : ""}`;
  const found = find(game, date, index, ctx, { target: target ?? s.targetDifficulty, seedBase });
  if (found.candidate) {
    const status = await repo.insertDaily(game, date, number, found.candidate, "GENERATED");
    if (status === "created") await repo.log({ level: "INFO", event: "generated", gameId: game, date, message: `${meta.name} #${number} generado (dificultad ${found.candidate.difficulty}, ${found.attempts} intento/s)` });
    return { game, date, status: status === "created" ? "created" : "exists", difficulty: found.candidate.difficulty, attempts: found.attempts };
  }

  // 2) Reserva previamente validada (se revalida contra los datos y el historial actuales).
  for (const reserve of await repo.listReserves(game)) {
    const { candidate } = toCandidate(game, reserve.payload, index, { ...ctx, minDifficulty: s.minDifficulty, maxDifficulty: s.maxDifficulty }, `reserve:${reserve.id}`);
    if (!candidate) continue;
    const status = await repo.assignReserve(reserve.id, game, date, number, candidate);
    await repo.log({ level: "WARN", event: "fallback", gameId: game, date, message: `Generación fallida: se usó una reserva para ${meta.name} #${number}`, details: { errors: found.errors } });
    return { game, date, status: status === "created" ? "fallback" : "exists", difficulty: candidate.difficulty, errors: found.errors };
  }

  // 3) Último recurso: relajar repetición y rango de dificultad (nunca la corrección ni la ambigüedad).
  const relaxed = find(game, date, index, { ...ctx, recentKeys: new Set(), softRecentKeys: new Set(), minDifficulty: 1, maxDifficulty: 3 }, { seedBase: `${seedBase}:relaxed` });
  if (relaxed.candidate) {
    const status = await repo.insertDaily(game, date, number, relaxed.candidate, "GENERATED");
    await repo.log({ level: "WARN", event: "relaxed", gameId: game, date, message: `Sin reservas válidas: ${meta.name} #${number} se generó ignorando repeticiones`, details: { errors: found.errors } });
    return { game, date, status: status === "created" ? "relaxed" : "exists", difficulty: relaxed.candidate.difficulty, errors: found.errors };
  }

  await repo.log({ level: "ERROR", event: "failed", gameId: game, date, message: `No se pudo generar ${meta.name} #${number}`, details: { errors: [...found.errors, ...relaxed.errors] } });
  return { game, date, status: "failed", errors: [...found.errors, ...relaxed.errors] };
}

/** Repone el stock de reservas validadas de un juego. */
export async function ensureReserves(repo: CalendarRepository, index: FootballIndex, game: GameSlug, settings: DailySettings, stamp: string): Promise<number> {
  const missing = settings.reserveSize - (await repo.listReserves(game)).length;
  let created = 0;
  const blockedKeys = await repo.getBlockedKeys(game);
  for (let i = 0; i < missing; i++) {
    const { candidate } = findCandidate(game, stamp, index, { recentKeys: new Set(), blockedKeys, minDifficulty: settings.minDifficulty, maxDifficulty: settings.maxDifficulty }, { seedBase: `${game}:reserve:${stamp}:${i}` });
    if (!candidate) continue;
    await repo.insertReserve(game, candidate);
    created++;
  }
  return created;
}

/** Corrida completa (cron): calendario de `horizonDays` días desde hoy + reservas, para cada juego. */
export async function ensureCalendar(
  repo: CalendarRepository,
  index: FootballIndex,
  { today, games = DAILY_GAMES.map((g) => g.slug) }: { today: string; games?: GameSlug[] },
): Promise<{ days: DayReport[]; reserves: Record<string, number> }> {
  const days: DayReport[] = [];
  const reserves: Record<string, number> = {};
  for (const game of games) {
    if (!getDailyAdapter(game)) continue;
    const settings = await repo.getSettings(game);
    for (let i = 0; i < settings.horizonDays; i++) {
      days.push(await ensureDay(repo, index, game, addDays(today, i), { settings }));
    }
    reserves[game] = await ensureReserves(repo, index, game, settings, today);
  }
  const created = days.filter((d) => d.status !== "exists").length;
  const failed = days.filter((d) => d.status === "failed").length;
  await repo.log({
    level: failed ? "ERROR" : "INFO",
    event: "cron-run",
    date: today,
    message: `Calendario revisado: ${created} desafíos nuevos, ${failed} fallidos, ${Object.values(reserves).reduce((a, b) => a + b, 0)} reservas nuevas`,
    details: { days: days.filter((d) => d.status !== "exists") },
  });
  return { days, reserves };
}

/**
 * Regenera un día. Sólo días no publicados (fecha futura y nunca servidos); con `override` y un
 * motivo, un admin puede forzarlo excepcionalmente y queda registrado como incidente.
 */
export async function regenerateDay(
  repo: CalendarRepository,
  index: FootballIndex,
  game: GameSlug,
  date: string,
  { today, target, override }: { today: string; target?: Difficulty; override?: { reason: string; by: string } },
): Promise<DayReport> {
  const [entry] = await repo.getEntries(game, date, date);
  const published = date <= today || Boolean(entry?.firstServedAt);
  if (entry && published && !override) throw new Error("Ese desafío ya fue publicado: sólo se puede cambiar con un override administrativo justificado");
  if (entry) await repo.removeDaily(game, date);
  if (override && published) {
    await repo.log({ level: "WARN", event: "admin-override", gameId: game, date, message: `Override de ${override.by}: ${override.reason}` });
  }
  return ensureDay(repo, index, game, date, { target, salt: `regen-${Date.now().toString(36)}` });
}
