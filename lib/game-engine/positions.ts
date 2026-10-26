import type { Position } from "@/types/football";

export const POSITION_LABELS: Record<Position, string> = {
  ARQ: "Arquero",
  LD: "Lateral derecho",
  DFC: "Defensor central",
  LI: "Lateral izquierdo",
  MCD: "Volante central",
  MC: "Mediocampista",
  MCO: "Enganche",
  MD: "Volante derecho",
  MI: "Volante izquierdo",
  ED: "Extremo derecho",
  EI: "Extremo izquierdo",
  DC: "Delantero centro",
};

export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

export const POSITION_GROUPS: Record<PositionGroup, Position[]> = {
  GK: ["ARQ"],
  DEF: ["LD", "DFC", "LI"],
  MID: ["MCD", "MC", "MCO", "MD", "MI"],
  FWD: ["ED", "EI", "DC"],
};

export const GROUP_LABELS: Record<PositionGroup, string> = {
  GK: "Arquero",
  DEF: "Defensor",
  MID: "Mediocampista",
  FWD: "Delantero",
};

export function positionGroup(position: Position): PositionGroup {
  return (Object.keys(POSITION_GROUPS) as PositionGroup[]).find((g) => POSITION_GROUPS[g].includes(position))!;
}

/**
 * Qué posiciones de jugador puede ocupar cada casillero de la cancha.
 * Es deliberadamente estricto: un central no ataja, un "9" no juega de lateral.
 */
export const SLOT_ACCEPTS: Record<Position, Position[]> = {
  ARQ: ["ARQ"],
  LD: ["LD"],
  LI: ["LI"],
  DFC: ["DFC"],
  MCD: ["MCD", "MC"],
  MC: ["MC", "MCD", "MCO"],
  MCO: ["MCO", "MC"],
  MD: ["MD", "ED", "LD"],
  MI: ["MI", "EI", "LI"],
  ED: ["ED", "MD"],
  EI: ["EI", "MI"],
  DC: ["DC"],
};

export function canPlaySlot(playerPositions: Position[], slot: Position): boolean {
  return playerPositions.some((p) => SLOT_ACCEPTS[slot].includes(p));
}
