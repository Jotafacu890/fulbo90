import { readJSON, writeJSON } from "@/lib/client/storage";
import { addDays } from "@/lib/game-engine/daily";
import type { GameSlug } from "@/lib/games/registry";

/**
 * Estadísticas locales. La interfaz StatsStore permite reemplazar localStorage por una API
 * cuando existan cuentas de usuario, sin tocar los juegos.
 */
export interface GameStats {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  totalMax: number;
  bestTimeMs: number | null;
  bestRarity: number | null;
  lastDailyDate: string | null;
  dailyCompleted: number;
}

export interface DailyRecord {
  score: number;
  max: number;
  win: boolean;
  timeMs?: number;
  rarity?: number;
  share: string;
}

export interface GameResultInput {
  game: GameSlug;
  mode: "daily" | "infinite" | "stored";
  date?: string;
  /** El desafío diario es el de hoy (sólo ese cuenta para la racha). */
  isToday?: boolean;
  score: number;
  max: number;
  win: boolean;
  timeMs?: number;
  rarity?: number;
  /** Arma el texto para compartir una vez conocida la racha actualizada. */
  share: (streak: number) => string;
}

export interface StatsStore {
  get(game: GameSlug): GameStats;
  record(result: GameResultInput): { stats: GameStats; share: string; newRecord: boolean };
  daily(game: GameSlug, date: string): DailyRecord | null;
}

export const EMPTY_STATS: GameStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalScore: 0,
  totalMax: 0,
  bestTimeMs: null,
  bestRarity: null,
  lastDailyDate: null,
  dailyCompleted: 0,
};

/** La racha se corta si pasó más de un día desde el último diario jugado. */
export function effectiveStreak(stats: GameStats, today: string): number {
  if (!stats.lastDailyDate) return 0;
  return stats.lastDailyDate === today || stats.lastDailyDate === addDays(today, -1) ? stats.currentStreak : 0;
}

export const localStats: StatsStore = {
  get(game) {
    return { ...EMPTY_STATS, ...readJSON<GameStats>(`stats:${game}`) };
  },
  daily(game, date) {
    return readJSON<DailyRecord>(`daily:${game}:${date}`);
  },
  record(result) {
    const stats = this.get(result.game);
    const isNewDaily = result.mode === "daily" && result.date && !this.daily(result.game, result.date);
    if (result.mode === "daily" && result.date && !isNewDaily) {
      return { stats, share: this.daily(result.game, result.date)?.share ?? result.share(stats.currentStreak), newRecord: false }; // ya registrado
    }

    stats.played += 1;
    if (result.win) stats.wins += 1;
    stats.totalScore += result.score;
    stats.totalMax += result.max;
    // Récord = mejorar una marca que ya existía (la primera partida no cuenta como récord).
    let newRecord = false;
    if (result.win && result.timeMs && (stats.bestTimeMs === null || result.timeMs < stats.bestTimeMs)) {
      newRecord ||= stats.bestTimeMs !== null;
      stats.bestTimeMs = result.timeMs;
    }
    if (result.rarity !== undefined && result.score > 0 && (stats.bestRarity === null || result.rarity < stats.bestRarity)) {
      newRecord ||= stats.bestRarity !== null;
      stats.bestRarity = result.rarity;
    }

    let share = result.share(0);
    if (result.mode === "daily" && result.date) {
      // Racha = días consecutivos completando el desafío del día. Jugar el archivo no la modifica.
      if (result.isToday && (!stats.lastDailyDate || result.date > stats.lastDailyDate)) {
        stats.currentStreak = stats.lastDailyDate === addDays(result.date, -1) ? stats.currentStreak + 1 : 1;
        stats.lastDailyDate = result.date;
        stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
      }
      stats.dailyCompleted += 1;
      share = result.share(stats.currentStreak);
      writeJSON(`daily:${result.game}:${result.date}`, {
        score: result.score,
        max: result.max,
        win: result.win,
        timeMs: result.timeMs,
        rarity: result.rarity,
        share,
      } satisfies DailyRecord);
    }
    writeJSON(`stats:${result.game}`, stats);
    return { stats, share, newRecord };
  },
};
