import type { GameSlug } from "@/lib/games/registry";
import type { ChallengeKind } from "../challenge-ref";
import type { FootballIndex } from "../dataset/football-index";
import type { Rng } from "../rng";

export interface GenerateContext {
  kind: ChallengeKind;
  date?: string;
  /** Variante pedida por el usuario en modo infinito (p. ej. "leyendas" en El 11). */
  variant?: string;
}

/**
 * Contrato de cada juego en el servidor.
 *  - generate: arma un desafío determinístico a partir del rng (seed diario o infinito).
 *  - validate: verifica un payload guardado en la base (creado en /admin) antes de usarlo.
 *  - toPublic: lo que se envía al navegador. Nunca incluye las respuestas.
 */
export interface GameEngine<TPayload, TPublic> {
  slug: GameSlug;
  generate(index: FootballIndex, rng: Rng, context: GenerateContext): TPayload;
  validate(payload: unknown, index: FootballIndex): TPayload;
  toPublic(payload: TPayload, index: FootballIndex): TPublic;
}

export class ChallengeGenerationError extends Error {}
