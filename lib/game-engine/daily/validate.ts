import type { GameSlug } from "@/lib/games/registry";
import type { FootballIndex } from "../dataset/football-index";
import { getDailyAdapter } from "./adapters";
import { fingerprint, isSoftKey } from "./keys";
import { VerificationError, type ValidationContext, type ValidationResult } from "./types";

/**
 * Validación automática previa a publicar un desafío:
 * respuestas correctas, ambigüedad, dificultad dentro del rango, repeticiones recientes y bloqueos.
 */
export function validateCandidate(game: GameSlug, payload: unknown, index: FootballIndex, ctx: ValidationContext): ValidationResult {
  const adapter = getDailyAdapter(game);
  if (!adapter) return { ok: false, errors: [`Juego sin adaptador diario: ${game}`], repeatKeys: [] };

  let verification;
  try {
    verification = adapter.verify(payload, index);
  } catch (e) {
    return { ok: false, errors: [e instanceof VerificationError ? e.message : `Error verificando: ${String(e)}`], repeatKeys: [] };
  }

  const errors = [...adapter.ambiguity(payload, index, verification)];
  const difficulty = adapter.difficulty(payload, index, verification);
  if (difficulty < ctx.minDifficulty || difficulty > ctx.maxDifficulty) {
    errors.push(`Dificultad ${difficulty} fuera del rango ${ctx.minDifficulty}–${ctx.maxDifficulty}`);
  }

  const repeatKeys = adapter.repeatKeys(payload, index);
  const repeated = repeatKeys.filter((k) => (isSoftKey(k) ? ctx.softRecentKeys?.has(k) : ctx.recentKeys.has(k)));
  if (repeated.length) errors.push(`Repite contenido reciente (${repeated.slice(0, 3).join(", ")})`);

  const blocked = [...repeatKeys, ...adapter.contentKeys(payload, index)].filter((k) => ctx.blockedKeys.has(k));
  if (blocked.length) errors.push(`Usa contenido bloqueado (${[...new Set(blocked)].slice(0, 3).join(", ")})`);

  return { ok: errors.length === 0, errors, difficulty, verification, repeatKeys, fingerprint: fingerprint(repeatKeys) };
}
