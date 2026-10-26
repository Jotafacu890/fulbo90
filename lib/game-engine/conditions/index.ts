export * from "./types";
export { normalizeCondition } from "./normalize";
export { evaluate, findMatchingPlayers } from "./evaluate";
export { describeCondition, explainCondition, competitionPhrase, nationalTeamPhrase } from "./describe";

import type { FootballIndex } from "../dataset/football-index";
import type { Condition } from "./types";

/** Builders tipados para escribir condiciones en código (generadores, desafíos curados). */
export const cond = {
  club: (club: string): Condition => ({ type: "PLAYED_FOR_CLUB", club }),
  academy: (club: string): Condition => ({ type: "ACADEMY_OF", club }),
  country: (nationalTeam: string): Condition => ({ type: "PLAYED_FOR_COUNTRY", nationalTeam }),
  nationality: (country: string): Condition => ({ type: "NATIONALITY", country }),
  won: (competition: string, opts: { club?: string; nationalTeam?: string; season?: number } = {}): Condition => ({
    type: "WON_COMPETITION",
    competition,
    ...opts,
  }),
  playedIn: (countries: string[], label?: string): Condition => ({ type: "PLAYED_IN_COUNTRY", countries, ...(label ? { label } : {}) }),
  active: (): Condition => ({ type: "ACTIVE_PLAYER" }),
  retired: (): Condition => ({ type: "RETIRED_PLAYER" }),
  decade: (decade: number): Condition => ({ type: "DECADE", decade }),
  coachedBy: (coach: string): Condition => ({ type: "COACHED_BY", coach }),
  and: (...conditions: Condition[]): Condition => ({ AND: conditions }),
  or: (...conditions: Condition[]): Condition => ({ OR: conditions }),
  not: (condition: Condition): Condition => ({ NOT: condition }),
};

/** Clave estable para comparar/deduplicar condiciones. */
export function conditionKey(c: Condition): string {
  return JSON.stringify(c);
}

export type { FootballIndex };
