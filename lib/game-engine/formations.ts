import type { Position } from "@/types/football";

export interface FormationSlot {
  position: Position;
  /** Coordenadas en % sobre la cancha (x: izquierda→derecha, y: arco rival→arco propio). */
  x: number;
  y: number;
}

export const FORMATIONS = {
  "4-3-3": [
    { position: "DC", x: 50, y: 13 },
    { position: "EI", x: 17, y: 22 },
    { position: "ED", x: 83, y: 22 },
    { position: "MC", x: 30, y: 43 },
    { position: "MC", x: 70, y: 43 },
    { position: "MCD", x: 50, y: 56 },
    { position: "LI", x: 13, y: 71 },
    { position: "DFC", x: 37, y: 76 },
    { position: "DFC", x: 63, y: 76 },
    { position: "LD", x: 87, y: 71 },
    { position: "ARQ", x: 50, y: 91 },
  ],
  "4-4-2": [
    { position: "DC", x: 35, y: 14 },
    { position: "DC", x: 65, y: 14 },
    { position: "MI", x: 13, y: 41 },
    { position: "MC", x: 38, y: 47 },
    { position: "MC", x: 62, y: 47 },
    { position: "MD", x: 87, y: 41 },
    { position: "LI", x: 13, y: 71 },
    { position: "DFC", x: 37, y: 76 },
    { position: "DFC", x: 63, y: 76 },
    { position: "LD", x: 87, y: 71 },
    { position: "ARQ", x: 50, y: 91 },
  ],
  "4-2-3-1": [
    { position: "DC", x: 50, y: 12 },
    { position: "EI", x: 17, y: 31 },
    { position: "MCO", x: 50, y: 33 },
    { position: "ED", x: 83, y: 31 },
    { position: "MCD", x: 36, y: 54 },
    { position: "MCD", x: 64, y: 54 },
    { position: "LI", x: 13, y: 71 },
    { position: "DFC", x: 37, y: 76 },
    { position: "DFC", x: 63, y: 76 },
    { position: "LD", x: 87, y: 71 },
    { position: "ARQ", x: 50, y: 91 },
  ],
  "3-5-2": [
    { position: "DC", x: 35, y: 14 },
    { position: "DC", x: 65, y: 14 },
    { position: "MI", x: 11, y: 42 },
    { position: "MC", x: 32, y: 44 },
    { position: "MCD", x: 50, y: 57 },
    { position: "MC", x: 68, y: 44 },
    { position: "MD", x: 89, y: 42 },
    { position: "DFC", x: 27, y: 75 },
    { position: "DFC", x: 50, y: 79 },
    { position: "DFC", x: 73, y: 75 },
    { position: "ARQ", x: 50, y: 91 },
  ],
} satisfies Record<string, FormationSlot[]>;

export type FormationName = keyof typeof FORMATIONS;
export const FORMATION_NAMES = Object.keys(FORMATIONS) as FormationName[];

export function isFormation(value: string): value is FormationName {
  return value in FORMATIONS;
}
