"use server";

import { getPickCounts, recordPick } from "@/lib/database/challenges";
import { gradeGridCell, gridCellAnswers, type GridPayload } from "@/lib/game-engine/games/grid";
import { loadChallenge } from "@/lib/game-engine/load-challenge";
import { rarityPercent } from "@/lib/game-engine/rarity";
import { GRID_MAX_ATTEMPTS } from "@/lib/game-engine/rules";
import { assertPlaying, decodeTicket, encodeTicket, type GridTicket } from "@/lib/game-engine/tickets";
import type { PlayerSummary } from "@/types/football";
import { GameRuleError, indexSchema, playerIdSchema, safeAction, ticketSchema, tokenSchema, type ActionResult } from "./shared";

interface GridMove {
  correct: boolean;
  player: PlayerSummary;
  /** % de jugadores que eligieron al mismo futbolista en esta celda. */
  rarity?: number;
  ticket: string;
  attemptsLeft: number;
  done: boolean;
}

/**
 * Valida una respuesta del Grid contra las relaciones del jugador (nunca contra strings del cliente)
 * y aplica las reglas en el servidor: intentos máximos, celda ya resuelta y jugador repetido.
 */
export async function guessGridCell(token: string, ticketToken: string, row: number, col: number, playerId: string): Promise<ActionResult<GridMove>> {
  return safeAction(async () => {
    tokenSchema.parse(token);
    ticketSchema.parse(ticketToken);
    indexSchema(2).parse(row);
    indexSchema(2).parse(col);
    playerIdSchema.parse(playerId);

    const { payload, index, key } = await loadChallenge<GridPayload>("grid", token);
    const ticket = decodeTicket(ticketToken, "grid", key);
    assertPlaying(ticket);
    const cell = row * 3 + col;
    if (ticket.cells[cell]) throw new GameRuleError("Esa celda ya está completa");
    if (ticket.cells.some((c) => c?.p === playerId)) throw new GameRuleError("Ya usaste a ese jugador en esta grilla");
    if (ticket.attempts >= GRID_MAX_ATTEMPTS) throw new GameRuleError("No te quedan intentos");

    const player = index.summary(playerId);
    if (!player) throw new GameRuleError("Jugador inexistente");
    const correct = gradeGridCell(payload, row, col, playerId, index);
    const next: GridTicket = { ...ticket, attempts: ticket.attempts + 1, cells: [...ticket.cells], misses: [...ticket.misses] };
    let rarity: number | undefined;

    if (correct) {
      const cellKey = `${row}-${col}`;
      // Cada ticket registra a lo sumo una elección por celda: no se puede inflar la estadística.
      await recordPick(key, cellKey, playerId);
      rarity = rarityPercent(playerId, gridCellAnswers(payload, row, col, index), await getPickCounts(key, cellKey), index);
      next.cells[cell] = { p: playerId, r: rarity };
    } else if (!next.misses.includes(cell)) {
      next.misses.push(cell);
    }
    next.done = next.cells.every(Boolean) || next.attempts >= GRID_MAX_ATTEMPTS;
    return { correct, player, rarity, ticket: encodeTicket(next), attemptsLeft: GRID_MAX_ATTEMPTS - next.attempts, done: next.done };
  });
}

/** El jugador decide terminar antes ("Terminar"). */
export async function finishGrid(token: string, ticketToken: string): Promise<ActionResult<{ ticket: string }>> {
  return safeAction(async () => {
    const { key } = await loadChallenge<GridPayload>("grid", tokenSchema.parse(token));
    const ticket = decodeTicket(ticketSchema.parse(ticketToken), "grid", key);
    return { ticket: encodeTicket({ ...ticket, done: true }) };
  });
}

/** Sólo con la partida terminada: algunas respuestas posibles de cada celda. */
export async function revealGrid(token: string, ticketToken: string): Promise<ActionResult<{ cells: { count: number; examples: PlayerSummary[] }[][] }>> {
  return safeAction(async () => {
    const { payload, index, key } = await loadChallenge<GridPayload>("grid", tokenSchema.parse(token));
    const ticket = decodeTicket(ticketSchema.parse(ticketToken), "grid", key);
    if (!ticket.done) throw new GameRuleError("Las respuestas se muestran al terminar");
    const cells = payload.rows.map((_, r) =>
      payload.cols.map((_, c) => {
        const answers = gridCellAnswers(payload, r, c, index).sort((a, b) => index.fame(b) - index.fame(a));
        return { count: answers.length, examples: answers.slice(0, 3).map((id) => index.summary(id)!) };
      }),
    );
    return { cells };
  });
}
