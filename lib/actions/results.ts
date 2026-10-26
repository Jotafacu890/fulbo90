"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { saveUserResult } from "@/lib/database/challenges";
import type { ImpostorPayload } from "@/lib/game-engine/games/impostor";
import { loadChallenge } from "@/lib/game-engine/load-challenge";
import { computeResult } from "@/lib/game-engine/scoring";
import { decodeTicket } from "@/lib/game-engine/tickets";
import { getGame, type GameSlug } from "@/lib/games/registry";
import { GameRuleError, safeAction, ticketSchema, tokenSchema, variantSchema, type ActionResult } from "./shared";

/**
 * Cierra la partida. Invitados: el resultado queda sólo en su navegador (localStorage).
 * Usuarios autenticados: se guarda en Neon, una única vez por desafío (unique userId + challengeKey).
 */
export async function submitResult(input: {
  game: string;
  token: string;
  ticket: string;
  variant?: string;
  timeMs?: number;
}): Promise<ActionResult<{ saved: boolean; alreadySaved: boolean }>> {
  return safeAction(async () => {
    const game = getGame(input.game);
    if (!game || game.status !== "available") throw new GameRuleError("Juego inexistente");
    const user = await getCurrentUser();
    if (!user) return { saved: false, alreadySaved: false };

    const ch = await loadChallenge(game.slug as GameSlug, tokenSchema.parse(input.token), { variant: variantSchema.parse(input.variant) });
    const ticket = decodeTicket(ticketSchema.parse(input.ticket), game.slug as GameSlug, ch.key);
    if (!ticket.done) throw new GameRuleError("La partida todavía no terminó");
    if (ticket.u && ticket.u !== user.id) throw new GameRuleError("La partida pertenece a otra cuenta");

    const rounds = game.slug === "impostor" ? (ch.payload as ImpostorPayload).rounds.length : undefined;
    const result = computeResult(ticket, { rounds });
    // El tiempo lo informa el cliente, acotado por el tiempo real transcurrido desde que se emitió el ticket.
    const elapsed = Date.now() - ticket.issuedAt;
    const timeMs = z.number().int().min(0).optional().parse(input.timeMs === undefined ? undefined : Math.round(input.timeMs));
    const saved = await saveUserResult({
      userId: user.id,
      gameId: game.slug,
      challengeKey: ch.key,
      dailyDate: ch.ref.kind === "daily" ? ch.ref.date : undefined,
      score: result.score,
      maxScore: result.max,
      rarity: result.rarity,
      timeMs: timeMs === undefined ? undefined : Math.min(timeMs, elapsed),
    });
    return { saved, alreadySaved: !saved };
  });
}
