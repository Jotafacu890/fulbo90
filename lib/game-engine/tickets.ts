import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { GameSlug } from "@/lib/games/registry";
import type { FormationName } from "./formations";

/**
 * Ticket de partida: el estado autoritativo de una partida (intentos, jugadores usados, celdas
 * resueltas…) firmado con HMAC. Viaja con cada respuesta y vuelve actualizado.
 *
 * Por qué así: en Vercel no hay procesos permanentes ni memoria compartida, y escribir en Neon en cada
 * jugada de un invitado no escala. El ticket hace que el servidor controle intentos y duplicados
 * sin estado propio; el cliente no puede alterarlo sin invalidar la firma.
 */
interface TicketBase {
  v: 1;
  g: GameSlug;
  /** Clave del desafío ("grid:daily:2026-10-26"). */
  k: string;
  /** Usuario autenticado al emitirlo (null = invitado). */
  u: string | null;
  issuedAt: number;
  done: boolean;
}

export interface GridTicket extends TicketBase {
  g: "grid";
  attempts: number;
  cells: ({ p: string; r: number } | null)[];
  misses: number[];
}

export interface WhoIsTicket extends TicketBase {
  g: "quien-es";
  shown: number;
  wrong: string[];
  won: boolean;
}

export interface ImpostorTicket extends TicketBase {
  g: "impostor";
  answers: boolean[];
}

export interface ElevenTicket extends TicketBase {
  g: "el-11";
  formation: FormationName | null;
  /** Segundos de cronómetro elegidos (0 = sin tiempo). */
  timer: number;
  startedAt: number | null;
  prompt: number;
  lives: number;
  skips: number;
  slots: (string | null)[];
}

export type GameTicket = GridTicket | WhoIsTicket | ImpostorTicket | ElevenTicket;
type TicketOf<G extends GameSlug> = Extract<GameTicket, { g: G }>;

export class TicketError extends Error {}

function secret(): string {
  const value = process.env.APP_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET debe estar configurado (32+ caracteres) en producción");
  return "fulbo90-dev-secret-no-usar-en-produccion-0000";
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encodeTicket(ticket: GameTicket): string {
  const data = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function decodeTicket<G extends GameSlug>(token: string, game: G, challengeKey: string): TicketOf<G> {
  if (typeof token !== "string" || token.length > 8000) throw new TicketError("Partida inválida");
  const [data, mac] = token.split(".");
  if (!data || !mac) throw new TicketError("Partida inválida");
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new TicketError("La partida fue modificada");
  const ticket = JSON.parse(Buffer.from(data, "base64url").toString()) as GameTicket;
  if (ticket.v !== 1 || ticket.g !== game || ticket.k !== challengeKey) throw new TicketError("La partida no corresponde a este desafío");
  return ticket as TicketOf<G>;
}

const base = <G extends GameSlug>(g: G, k: string, u: string | null) => ({ v: 1 as const, g, k, u, issuedAt: Date.now(), done: false });

export function newTicket(game: GameSlug, challengeKey: string, userId: string | null): string {
  switch (game) {
    case "grid":
      return encodeTicket({ ...base("grid", challengeKey, userId), attempts: 0, cells: Array(9).fill(null), misses: [] });
    case "quien-es":
      return encodeTicket({ ...base("quien-es", challengeKey, userId), shown: 1, wrong: [], won: false });
    case "impostor":
      return encodeTicket({ ...base("impostor", challengeKey, userId), answers: [] });
    case "el-11":
      return encodeTicket({ ...base("el-11", challengeKey, userId), formation: null, timer: 0, startedAt: null, prompt: 0, lives: 3, skips: 3, slots: Array(11).fill(null) });
    default:
      throw new TicketError(`Juego sin tickets: ${game}`);
  }
}

export function assertPlaying(ticket: GameTicket): void {
  if (ticket.done) throw new TicketError("La partida ya terminó");
}
