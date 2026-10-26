import type { GameSlug } from "@/lib/games/registry";

/** Datos del desafío que la página del servidor le pasa al componente del juego. */
export interface ChallengeInfo {
  game: GameSlug;
  token: string;
  /** "grid:daily:2026-10-23" — clave para guardar progreso y estadísticas. */
  key: string;
  mode: "daily" | "infinite" | "stored";
  date?: string;
  number?: number;
  variant?: string;
  /** Ticket firmado inicial emitido por el servidor (estado autoritativo de la partida). */
  ticket: string;
  /** Hay sesión iniciada: el resultado se guarda en la cuenta. */
  loggedIn: boolean;
}
