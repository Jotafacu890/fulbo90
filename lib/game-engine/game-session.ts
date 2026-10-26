import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { findUserResult } from "@/lib/database/challenges";
import type { GameSlug } from "@/lib/games/registry";
import { newTicket } from "./tickets";
import { after } from "next/server";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { argentinaDate } from "./daily";
import { markDailyServed } from "./daily/service";

/**
 * Prepara la partida para la página: ticket firmado inicial, usuario (si hay sesión) y, para
 * usuarios autenticados, el resultado ya guardado de este desafío (no se puede volver a jugar).
 */
export async function prepareGameSession(game: GameSlug, challengeKey: string, dailyDate?: string) {
  if (dailyDate && dailyDate <= argentinaDate() && isDatabaseConfigured()) {
    // Primera vez servido → inmutable. Se registra después de responder para no demorar la página.
    after(() => markDailyServed(game, dailyDate).catch(() => {}));
  }
  const user = await getCurrentUser();
  const existing = user ? await findUserResult(user.id, challengeKey) : null;
  return {
    ticket: newTicket(game, challengeKey, user?.id ?? null),
    loggedIn: Boolean(user),
    existing: existing ? { score: existing.score, maxScore: existing.maxScore, rarity: existing.rarity, timeMs: existing.timeMs } : null,
  };
}
