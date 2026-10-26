import "server-only";
import { z } from "zod";
import { TicketError } from "@/lib/game-engine/tickets";
import { ChallengeAccessError } from "@/lib/game-engine/load-challenge";

/**
 * Las server actions de juego nunca lanzan hacia el cliente: devuelven un error legible
 * (en producción Next oculta el mensaje de las excepciones).
 */
export type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof TicketError || e instanceof ChallengeAccessError || e instanceof z.ZodError || e instanceof GameRuleError) {
      return { ok: false, error: e instanceof z.ZodError ? "Datos inválidos" : e.message };
    }
    console.error(e);
    return { ok: false, error: "Algo falló del lado del servidor. Probá de nuevo." };
  }
}

/** Violación de una regla del juego (celda ocupada, jugador repetido…). */
export class GameRuleError extends Error {}

// Validación de argumentos de las actions (nunca confiar en lo que manda el navegador).
export const tokenSchema = z.string().min(6).max(60);
export const ticketSchema = z.string().min(10).max(8000);
export const playerIdSchema = z.string().regex(/^[a-z0-9-]{2,80}$/);
export const indexSchema = (max: number) => z.number().int().min(0).max(max);
export const variantSchema = z.string().max(30).optional();
