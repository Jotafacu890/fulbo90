import type { Condition } from "../conditions";
import type { FootballIndex } from "../dataset/football-index";

export type Difficulty = 1 | 2 | 3;

export interface Verification {
  /** Consignas del desafío (se guardan en ChallengeCondition). */
  conditions: { key: string; label: string; condition: Condition }[];
  /** Respuestas correctas verificadas contra los datos (se guardan en ChallengeAnswer). */
  answers: { key: string; playerIds: string[] }[];
}

/**
 * Lo que el motor diario necesita saber de cada juego. Un modo nuevo se suma al calendario
 * implementando este contrato (y su GameEngine) y registrándolo en daily/adapters/index.ts.
 */
export interface DailyAdapter<TPayload = unknown> {
  /** Comprueba que el desafío tenga respuestas correctas. Lanza VerificationError si no. */
  verify(payload: TPayload, index: FootballIndex): Verification;
  /** Problemas de ambigüedad o redundancia (lista vacía = OK). */
  ambiguity(payload: TPayload, index: FootballIndex, verification: Verification): string[];
  /** 1 fácil · 2 media · 3 difícil, calculado con datos (cantidad de respuestas, fama de los jugadores…). */
  difficulty(payload: TPayload, index: FootballIndex, verification: Verification): Difficulty;
  /** Claves que no pueden repetirse dentro de la ventana configurada. */
  repeatKeys(payload: TPayload, index: FootballIndex): string[];
  /** Claves de todo el contenido usado (para bloquear jugadores, clubes o consignas desde el admin). */
  contentKeys(payload: TPayload, index: FootballIndex): string[];
}

export class VerificationError extends Error {}

export interface ValidationContext {
  /** Claves de repetición exacta usadas dentro de la ventana larga (antes y después de la fecha). */
  recentKeys: Set<string>;
  /** Claves de repetición parcial usadas dentro de la ventana corta. */
  softRecentKeys?: Set<string>;
  blockedKeys: Set<string>;
  minDifficulty: number;
  maxDifficulty: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  difficulty?: Difficulty;
  verification?: Verification;
  repeatKeys: string[];
  fingerprint?: string;
}
