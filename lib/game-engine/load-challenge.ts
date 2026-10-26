import { getGame, type GameSlug } from "@/lib/games/registry";
import { getStoredChallenge } from "@/lib/database/challenges";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getStoredDaily } from "./daily/service";
import { dataSourceKind, getFootballIndex } from "@/lib/database/source";
import { parseChallengeToken, type ChallengeRef } from "./challenge-ref";
import { argentinaDate, challengeNumber } from "./daily";
import type { FootballIndex } from "./dataset/football-index";
import { getEngine } from "./games";
import { createRng } from "./rng";

export interface LoadedChallenge<TPayload> {
  game: GameSlug;
  ref: ChallengeRef;
  /** Clave única para estadísticas y localStorage: "grid:daily:2026-10-23". */
  key: string;
  number?: number;
  payload: TPayload;
  index: FootballIndex;
}

export class ChallengeAccessError extends Error {}

// Los desafíos generados por seed se cachean: cada respuesta del usuario vuelve a cargar el desafío.
const cache = new Map<string, unknown>();
const MAX_CACHE = 300;

/** Se llama al editar datos o desafíos en /admin. */
export function clearChallengeCache() {
  cache.clear();
}

function remember<T>(key: string, value: T): T {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

/** Variante que no lanza: las páginas muestran un error amigable en vez de romper. */
export async function tryLoadChallenge<TPayload>(
  game: GameSlug,
  token: string,
  options: { variant?: string } = {},
): Promise<{ challenge: LoadedChallenge<TPayload>; error?: undefined } | { challenge?: undefined; error: string }> {
  try {
    return { challenge: await loadChallenge<TPayload>(game, token, options) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cargar el desafío" };
  }
}

/**
 * Resuelve un token en un desafío concreto. Es la única puerta de entrada que usan las páginas y las
 * server actions, así la validación de respuestas siempre ocurre contra el mismo desafío.
 */
export async function loadChallenge<TPayload>(game: GameSlug, token: string, options: { variant?: string; allowFuture?: boolean } = {}): Promise<LoadedChallenge<TPayload>> {
  const engine = getEngine(game);
  const meta = getGame(game);
  if (!engine || !meta) throw new ChallengeAccessError(`Juego no disponible: ${game}`);
  const ref = parseChallengeToken(token);
  if (!ref) throw new ChallengeAccessError("Desafío inválido");

  const index = await getFootballIndex();
  const variantKey = options.variant ? `:${options.variant}` : "";
  const key = `${game}:${ref.token}${ref.kind === "infinite" ? variantKey : ""}`;
  const cached = cache.get(key) as TPayload | undefined;

  let payload: TPayload;
  let number: number | undefined;

  if (ref.kind === "daily") {
    const today = argentinaDate();
    if (!options.allowFuture && ref.date! > today) throw new ChallengeAccessError("Ese desafío todavía no está disponible");
    if (ref.date! < meta.launchDate) throw new ChallengeAccessError("Ese desafío es anterior al lanzamiento del juego");
    number = challengeNumber(ref.date!, meta.launchDate);
    if (cached) payload = cached;
    else if (isDatabaseConfigured() && dataSourceKind() === "prisma") {
      // Siempre el desafío guardado en el calendario de Neon (si faltara, se genera, valida y guarda en el momento).
      const stored = await getStoredDaily(game, ref.date!);
      if (!stored) throw new ChallengeAccessError("No hay desafío disponible para ese día");
      // Lo publicado no se recalcula: si los datos cambiaron, se sirve tal cual se verificó al publicarlo.
      let normalized: TPayload;
      try {
        normalized = engine.validate(stored.payload, index) as TPayload;
      } catch {
        normalized = stored.payload as TPayload;
      }
      payload = remember(key, normalized);
      number = stored.number;
    } else {
      // Sin base de datos (desarrollo): el mismo seed diario determinístico que usa el generador.
      payload = remember(key, engine.generate(index, createRng(`${game}:daily:${ref.date}`), { kind: "daily", date: ref.date }) as TPayload);
    }
  } else if (ref.kind === "stored") {
    const stored = cached ? null : await getStoredChallenge(ref.id!);
    if (!cached && (!stored || stored.gameId !== game)) throw new ChallengeAccessError("Desafío no encontrado");
    payload = cached ?? remember(key, engine.validate(stored!.payload, index) as TPayload);
  } else {
    payload = cached ?? remember(key, engine.generate(index, createRng(`${game}:inf:${ref.seed}`), { kind: "infinite", variant: options.variant }) as TPayload);
  }

  return { game, ref, key, number, payload, index };
}
