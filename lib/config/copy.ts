/**
 * Voz de la marca: expresiones futboleras para la interfaz, en un solo lugar.
 * Regla: el grito va primero y el dato concreto después, para que siempre se entienda qué pasó.
 */
export const COPY = {
  correct: "¡Golazo!",
  wrong: "¡Le erraste al arco!",
  perfect: "¡Partido perfecto!",
  completed: "¡Final del partido!",
  newRecord: "¡Rompiste la tabla!",
  streak: "¡Venís en llamas!",
  outOfAttempts: "¡Pitazo final!",
  /** Arranque de un desafío. */
  kickoff: "¡Arranca el partido!",
} as const;

/** Título del modal de resultado según cómo terminó la partida. */
export function resultTitle({ score, max, ranOut }: { score: number; max: number; ranOut?: boolean }): string {
  if (score === max) return COPY.perfect;
  if (ranOut) return COPY.outOfAttempts;
  return COPY.completed;
}
