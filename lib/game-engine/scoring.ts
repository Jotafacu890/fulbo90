import "server-only";
import { WHO_IS_POINTS } from "./games/who-is";
import { rarityScore } from "./rarity";
import type { GameTicket } from "./tickets";

export interface ComputedResult {
  score: number;
  max: number;
  win: boolean;
  rarity?: number;
}

/** El resultado que se guarda en Neon sale del ticket firmado, nunca de números enviados por el cliente. */
export function computeResult(ticket: GameTicket, context: { rounds?: number; clues?: number } = {}): ComputedResult {
  switch (ticket.g) {
    case "grid": {
      const score = ticket.cells.filter(Boolean).length;
      return { score, max: 9, win: score === 9, rarity: rarityScore(ticket.cells.map((c) => c?.r ?? null)) };
    }
    case "quien-es": {
      const score = ticket.won ? (WHO_IS_POINTS[ticket.shown - 1] ?? 0) : 0;
      return { score, max: WHO_IS_POINTS[0], win: ticket.won };
    }
    case "impostor": {
      const score = ticket.answers.filter(Boolean).length;
      const max = context.rounds ?? ticket.answers.length;
      return { score, max, win: score >= Math.ceil(max * 0.6) };
    }
    case "el-11": {
      const score = ticket.slots.filter(Boolean).length;
      return { score, max: 11, win: score === 11 };
    }
  }
}
