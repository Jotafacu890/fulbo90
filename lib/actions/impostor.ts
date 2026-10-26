"use server";

import { explainImpostor, type ImpostorPayload } from "@/lib/game-engine/games/impostor";
import { loadChallenge } from "@/lib/game-engine/load-challenge";
import { assertPlaying, decodeTicket, encodeTicket } from "@/lib/game-engine/tickets";
import { GameRuleError, indexSchema, playerIdSchema, safeAction, ticketSchema, tokenSchema, type ActionResult } from "./shared";

interface ImpostorMove {
  correct: boolean;
  impostorId: string;
  explanation: string;
  members: string[];
  ticket: string;
  done: boolean;
}

/** Una sola respuesta por ronda y en orden: el ticket impide responder dos veces la misma. */
export async function answerImpostor(token: string, ticketToken: string, round: number, playerId: string): Promise<ActionResult<ImpostorMove>> {
  return safeAction(async () => {
    indexSchema(20).parse(round);
    playerIdSchema.parse(playerId);
    const { payload, index, key } = await loadChallenge<ImpostorPayload>("impostor", tokenSchema.parse(token));
    const ticket = decodeTicket(ticketSchema.parse(ticketToken), "impostor", key);
    assertPlaying(ticket);
    if (round !== ticket.answers.length) throw new GameRuleError("Esa ronda ya fue respondida");
    const r = payload.rounds[round];
    if (!r) throw new GameRuleError("Ronda inexistente");
    if (!r.options.includes(playerId)) throw new GameRuleError("Ese jugador no está en la ronda");

    const correct = r.impostorId === playerId;
    const answers = [...ticket.answers, correct];
    const done = answers.length >= payload.rounds.length;
    const { impostor, members } = explainImpostor(r, index);
    return { correct, impostorId: r.impostorId, explanation: impostor, members, ticket: encodeTicket({ ...ticket, answers, done }), done };
  });
}
