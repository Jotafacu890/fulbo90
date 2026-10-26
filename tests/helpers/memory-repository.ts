import { addDays } from "@/lib/game-engine/daily";
import { DEFAULT_SETTINGS, type CalendarEntry, type CalendarRepository, type Candidate, type DailySettings, type LogEntry } from "@/lib/game-engine/daily/scheduler";
import type { GameSlug } from "@/lib/games/registry";

interface StoredDaily extends CalendarEntry {
  candidate: Candidate;
}

/** Implementación en memoria del repositorio del calendario, con la misma semántica de unicidad que Neon. */
export class MemoryCalendarRepository implements CalendarRepository {
  dailies = new Map<string, StoredDaily>();
  usage: { game: GameSlug; date: string; key: string }[] = [];
  reserves: { id: string; game: GameSlug; payload: unknown; used: boolean }[] = [];
  blocked = new Set<string>();
  logs: LogEntry[] = [];
  settings: Partial<Record<GameSlug, DailySettings>> = {};
  private seq = 0;

  private k = (game: string, date: string) => `${game}|${date}`;

  async getSettings(game: GameSlug) {
    return this.settings[game] ?? DEFAULT_SETTINGS;
  }

  async getEntries(game: GameSlug, from: string, to: string) {
    return [...this.dailies.values()].filter((d) => d.gameId === game && d.date >= from && d.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRecentKeys(game: GameSlug, from: string, to: string, excludeDate: string) {
    return new Set(this.usage.filter((u) => u.game === game && u.date >= from && u.date <= to && u.date !== excludeDate).map((u) => u.key));
  }

  async getBlockedKeys() {
    return new Set(this.blocked);
  }

  async insertDaily(game: GameSlug, date: string, _number: number, candidate: Candidate, source: CalendarEntry["source"]): Promise<"created" | "exists"> {
    // Simula la latencia de red para que las carreras entre ejecuciones sean reales en los tests.
    await new Promise((r) => setTimeout(r, 1));
    if (this.dailies.has(this.k(game, date))) return "exists";
    this.dailies.set(this.k(game, date), { date, gameId: game, challengeId: `c${++this.seq}`, source, difficulty: candidate.difficulty, firstServedAt: null, candidate });
    for (const key of candidate.repeatKeys) this.usage.push({ game, date, key });
    return "created";
  }

  async removeDaily(game: GameSlug, date: string) {
    this.dailies.delete(this.k(game, date));
    this.usage = this.usage.filter((u) => !(u.game === game && u.date === date));
  }

  async listReserves(game: GameSlug) {
    return this.reserves.filter((r) => r.game === game && !r.used).map((r) => ({ id: r.id, payload: r.payload }));
  }

  async insertReserve(game: GameSlug, candidate: Candidate) {
    this.reserves.push({ id: `r${++this.seq}`, game, payload: candidate.payload, used: false });
  }

  async assignReserve(reserveId: string, game: GameSlug, date: string, number: number, candidate: Candidate) {
    const reserve = this.reserves.find((r) => r.id === reserveId && !r.used);
    if (!reserve) return "exists" as const;
    const status = await this.insertDaily(game, date, number, candidate, "RESERVE");
    if (status === "created") reserve.used = true;
    return status;
  }

  async log(entry: LogEntry) {
    this.logs.push(entry);
  }

  /** Utilidad de test: fechas consecutivas desde `from`. */
  static range(from: string, days: number) {
    return Array.from({ length: days }, (_, i) => addDays(from, i));
  }
}
