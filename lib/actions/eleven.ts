"use server";

import { z } from "zod";
import { findMatchingPlayers } from "@/lib/game-engine/conditions";
import { FORMATIONS, isFormation } from "@/lib/game-engine/formations";
import { gradeElevenPick, type ElevenPayload } from "@/lib/game-engine/games/starting-eleven";
import { loadChallenge } from "@/lib/game-engine/load-challenge";
import { canPlaySlot } from "@/lib/game-engine/positions";
import { ELEVEN_TIMER_GRACE_MS, ELEVEN_TIMERS } from "@/lib/game-engine/rules";
import { assertPlaying, decodeTicket, encodeTicket, type ElevenTicket } from "@/lib/game-engine/tickets";
import type { PlayerSummary } from "@/types/football";
import { GameRuleError, indexSchema, playerIdSchema, safeAction, ticketSchema, tokenSchema, variantSchema, type ActionResult } from "./shared";

async function load(token: string, variant: string | undefined, ticketToken: string) {
  const ch = await loadChallenge<ElevenPayload>("el-11", tokenSchema.parse(token), { variant: variantSchema.parse(variant) });
  return { ...ch, ticket: decodeTicket(ticketSchema.parse(ticketToken), "el-11", ch.key) };
}

const isOver = (t: ElevenTicket, prompts: number) => t.lives <= 0 || t.slots.every(Boolean) || t.prompt >= prompts;

const timedOut = (t: ElevenTicket) => t.timer > 0 && t.startedAt !== null && Date.now() > t.startedAt + t.timer * 1000 + ELEVEN_TIMER_GRACE_MS;

/** Arranca la partida fijando formación y cronómetro (no se pueden cambiar a mitad de partido). */
export async function startEleven(token: string, variant: string | undefined, ticketToken: string, formation: string, timer: number): Promise<ActionResult<{ ticket: string }>> {
  return safeAction(async () => {
    const { ticket } = await load(token, variant, ticketToken);
    assertPlaying(ticket);
    if (!isFormation(formation)) throw new GameRuleError("Formación inválida");
    if (!(ELEVEN_TIMERS as readonly number[]).includes(timer)) throw new GameRuleError("Cronómetro inválido");
    if (ticket.startedAt) return { ticket: ticketToken };
    return { ticket: encodeTicket({ ...ticket, formation, timer, startedAt: Date.now() }) };
  });
}

interface ElevenMove {
  correct: boolean;
  /** El jugador cumple la consigna pero no puede ocupar ese casillero. */
  invalidSlot?: boolean;
  player: PlayerSummary;
  ticket: string;
  done: boolean;
  lives: number;
}

export async function checkElevenPick(token: string, variant: string | undefined, ticketToken: string, playerId: string, slotIndex: number): Promise<ActionResult<ElevenMove>> {
  return safeAction(async () => {
    playerIdSchema.parse(playerId);
    indexSchema(10).parse(slotIndex);
    const { payload, index, ticket } = await load(token, variant, ticketToken);
    assertPlaying(ticket);
    if (!ticket.formation || !ticket.startedAt) throw new GameRuleError("La partida no arrancó");
    if (timedOut(ticket)) throw new GameRuleError("Se terminó el tiempo");
    if (ticket.slots[slotIndex]) throw new GameRuleError("Esa posición ya está ocupada");
    if (ticket.slots.includes(playerId)) throw new GameRuleError("Ya usaste a ese jugador");
    const player = index.summary(playerId);
    if (!player) throw new GameRuleError("Jugador inexistente");

    const slot = FORMATIONS[ticket.formation][slotIndex];
    const fitsSlot = canPlaySlot(player.positions, slot.position);
    const correct = fitsSlot && gradeElevenPick(payload, ticket.prompt, playerId, index);
    const next: ElevenTicket = { ...ticket, slots: [...ticket.slots] };
    if (correct) {
      next.slots[slotIndex] = playerId;
      next.prompt += 1;
    } else {
      next.lives -= 1;
    }
    next.done = isOver(next, payload.prompts.length);
    return { correct, invalidSlot: !fitsSlot, player, ticket: encodeTicket(next), done: next.done, lives: next.lives };
  });
}

export async function skipElevenPrompt(token: string, variant: string | undefined, ticketToken: string): Promise<ActionResult<{ ticket: string; done: boolean }>> {
  return safeAction(async () => {
    const { payload, ticket } = await load(token, variant, ticketToken);
    assertPlaying(ticket);
    if (ticket.skips <= 0) throw new GameRuleError("No te quedan pases");
    const next = { ...ticket, skips: ticket.skips - 1, prompt: ticket.prompt + 1 };
    next.done = isOver(next, payload.prompts.length);
    return { ticket: encodeTicket(next), done: next.done };
  });
}

export async function finishEleven(token: string, variant: string | undefined, ticketToken: string): Promise<ActionResult<{ ticket: string }>> {
  return safeAction(async () => {
    const { ticket } = await load(token, variant, ticketToken);
    return { ticket: encodeTicket({ ...ticket, done: true }) };
  });
}

/** Ejemplos de respuestas válidas para las consignas (sólo al terminar). */
export async function revealEleven(
  token: string,
  variant: string | undefined,
  ticketToken: string,
  promptIndexes: number[],
): Promise<ActionResult<{ examples: Record<number, PlayerSummary[]> }>> {
  return safeAction(async () => {
    const indexes = z.array(indexSchema(30)).max(20).parse(promptIndexes);
    const { payload, index, ticket } = await load(token, variant, ticketToken);
    if (!ticket.done) throw new GameRuleError("Las respuestas se muestran al terminar");
    const examples: Record<number, PlayerSummary[]> = {};
    for (const i of indexes) {
      const prompt = payload.prompts[i];
      if (!prompt) continue;
      examples[i] = findMatchingPlayers(prompt.condition, index)
        .sort((a, b) => index.fame(b) - index.fame(a))
        .slice(0, 3)
        .map((id) => index.summary(id)!);
    }
    return { examples };
  });
}
