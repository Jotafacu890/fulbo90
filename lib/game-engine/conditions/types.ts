import type { AchievementResult, Position } from "@/types/football";

export const CONDITION_TYPES = [
  "PLAYED_FOR_CLUB",
  "PLAYED_FOR_COUNTRY",
  "NATIONALITY",
  "POSITION",
  "WON_COMPETITION",
  "PLAYED_COMPETITION",
  "PLAYED_IN_COUNTRY",
  "COACHED_BY",
  "TEAMMATE_WITH",
  "PLAYED_MATCH",
  "SCORED_IN_MATCH",
  "ACADEMY_OF",
  "ACTIVE_PLAYER",
  "RETIRED_PLAYER",
  "DECADE",
  "MIN_GOALS",
  "MIN_APPEARANCES",
] as const;

export type ConditionType = (typeof CONDITION_TYPES)[number];

interface Labeled {
  /** Texto a mostrar en lugar del generado automáticamente ("Jugó en Europa"). */
  label?: string;
}

export type LeafCondition = Labeled &
  (
    | { type: "PLAYED_FOR_CLUB"; club: string }
    | { type: "PLAYED_FOR_COUNTRY"; nationalTeam: string }
    | { type: "NATIONALITY"; country: string }
    | { type: "POSITION"; positions: Position[] }
    | { type: "WON_COMPETITION"; competition: string; club?: string; nationalTeam?: string; season?: number; result?: AchievementResult }
    | { type: "PLAYED_COMPETITION"; competition: string }
    | { type: "PLAYED_IN_COUNTRY"; countries: string[] }
    | { type: "COACHED_BY"; coach: string }
    | { type: "TEAMMATE_WITH"; player: string }
    | { type: "PLAYED_MATCH"; match: string }
    | { type: "SCORED_IN_MATCH"; match: string }
    | { type: "ACADEMY_OF"; club: string }
    | { type: "ACTIVE_PLAYER" }
    | { type: "RETIRED_PLAYER" }
    | { type: "DECADE"; decade: number }
    | { type: "MIN_GOALS"; min: number; club?: string }
    | { type: "MIN_APPEARANCES"; min: number; club?: string }
  );

export type Condition =
  | LeafCondition
  | (Labeled & { AND: Condition[] })
  | (Labeled & { OR: Condition[] })
  | (Labeled & { NOT: Condition });

/**
 * Forma de entrada aceptada (admin, JSON en base de datos): además de la forma canónica admite
 * la abreviada `{ PLAYED_FOR_CLUB: "River Plate" }` y referencias por nombre.
 */
export type ConditionInput = Condition | { [key: string]: unknown };

export class ConditionError extends Error {}

export const isAnd = (c: Condition): c is Labeled & { AND: Condition[] } => "AND" in c;
export const isOr = (c: Condition): c is Labeled & { OR: Condition[] } => "OR" in c;
export const isNot = (c: Condition): c is Labeled & { NOT: Condition } => "NOT" in c;
export const isLeaf = (c: Condition): c is LeafCondition => "type" in c;
