import type { AchievementResult, Position } from "@/types/football";

/**
 * Formato compacto para escribir el seed a mano. `data/index.ts` lo expande a FootballDataset.
 *
 * Reglas de carga:
 *  - Sólo datos verificables. Si un año o un club no se puede confirmar, se omite.
 *  - Años: fromYear = año de llegada, toYear = año de salida (null = sigue en el club).
 */

/**
 * [clubId, desde?, hasta?, flags?]
 * flags: "a" = surgido de las inferiores del club · "y" = sólo inferiores (no debutó) · "l" = préstamo
 */
export type StintSeed = [clubId: string, from?: number | null, to?: number | null, flags?: string];

/** [competitionId, temporada, equipo (clubId o selección en mayúsculas: "ARG"), resultado?] */
export type TitleSeed = [competitionId: string, season: number, team: string, result?: AchievementResult];

/** [selección, desde?, hasta?] */
export type NationalTeamSeed = [teamId: string, from?: number | null, to?: number | null];

export interface PlayerSeed {
  id: string;
  name: string;
  short?: string;
  nat: string;
  nat2?: string;
  born?: string;
  pos: [Position, ...Position[]];
  /** Por defecto false (retirado). */
  active?: boolean;
  clubs: StintSeed[];
  nt?: NationalTeamSeed[];
  titles?: TitleSeed[];
}
