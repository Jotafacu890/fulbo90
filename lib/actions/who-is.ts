"use server";

import { WHO_IS_POINTS, type Clue, type WhoIsPayload } from "@/lib/game-engine/games/who-is";
import { loadChallenge } from "@/lib/game-engine/load-challenge";
import { assertPlaying, decodeTicket, encodeTicket } from "@/lib/game-engine/tickets";
import type { PlayerSummary } from "@/types/football";
import { GameRuleError, playerIdSchema, safeAction, ticketSchema, tokenSchema, type ActionResult } from "./shared";

interface WhoIsMove {
  clues: Clue[];
  ticket: string;
  done: boolean;
}

/** Pedir otra pista: el servidor lleva la cuenta de cuántas se mostraron (y por lo tanto del puntaje). */
export async function requestWhoIsClue(token: string, ticketToken: string): Promise<ActionResult<WhoIsMove>> {
  return safeAction(async () => {
    const { payload, key } = await loadChallenge<WhoIsPayload>("quien-es", tokenSchema.parse(token));
    const ticket = decodeTicket(ticketSchema.parse(ticketToken), "quien-es", key);
    assertPlaying(ticket);
    if (ticket.shown >= payload.clues.length) throw new GameRuleError("No quedan más pistas");
    const next = { ...ticket, shown: ticket.shown + 1 };
    return { clues: payload.clues.slice(0, next.shown), ticket: encodeTicket(next), done: false };
  });
}

export async function guessWhoIs(
  token: string,
  ticketToken: string,
  playerId: string,
): Promise<ActionResult<WhoIsMove & { correct: boolean; player: PlayerSummary; points: number }>> {
  return safeAction(async () => {
    playerIdSchema.parse(playerId);
    const { payload, index, key } = await loadChallenge<WhoIsPayload>("quien-es", tokenSchema.parse(token));
    const ticket = decodeTicket(ticketSchema.parse(ticketToken), "quien-es", key);
    assertPlaying(ticket);
    if (ticket.wrong.includes(playerId)) throw new GameRuleError("Ya probaste con ese jugador");
    const player = index.summary(playerId);
    if (!player) throw new GameRuleError("Jugador inexistente");

    const correct = payload.playerId === playerId;
    const next = { ...ticket, wrong: correct ? ticket.wrong : [...ticket.wrong, playerId] };
    if (correct) {
      next.won = true;
      next.done = true;
    } else if (next.shown >= payload.clues.length) {
      next.done = true;
    } else {
      next.shown += 1;
    }
    const points = next.won ? (WHO_IS_POINTS[next.shown - 1] ?? 0) : 0;
    return { correct, player, points, clues: payload.clues.slice(0, next.shown), ticket: encodeTicket(next), done: next.done };
  });
}

export interface WhoIsReveal {
  player: PlayerSummary;
  career: { club: string; clubId: string; years: string; colors: [string, string] }[];
}

/** La respuesta sólo se revela con la partida terminada (ganada o perdida). */
export async function revealWhoIs(token: string, ticketToken: string): Promise<ActionResult<WhoIsReveal>> {
  return safeAction(async () => {
    const { payload, index, key } = await loadChallenge<WhoIsPayload>("quien-es", tokenSchema.parse(token));
    const ticket = decodeTicket(ticketSchema.parse(ticketToken), "quien-es", key);
    if (!ticket.done) throw new GameRuleError("La respuesta se muestra al terminar");
    const career = index
      .seniorStints(payload.playerId)
      .sort((a, b) => (a.fromYear ?? 9999) - (b.fromYear ?? 9999))
      .map((s) => {
        const club = index.club(s.clubId)!;
        return {
          club: club.name,
          clubId: club.id,
          years: s.fromYear ? `${s.fromYear}${s.toYear === null ? "–hoy" : s.toYear && s.toYear !== s.fromYear ? `–${s.toYear}` : ""}` : "",
          colors: [club.primaryColor ?? "#1FA463", club.secondaryColor ?? "#F5F7F5"] as [string, string],
        };
      });
    return { player: index.summary(payload.playerId)!, career };
  });
}
