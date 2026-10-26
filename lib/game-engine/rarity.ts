import type { FootballIndex } from "./dataset/football-index";

/** Peso del prior: equivale a "K respuestas imaginarias" repartidas según la popularidad estimada. */
const PRIOR_WEIGHT = 25;

/**
 * Porcentaje de jugadores que eligieron a `playerId` en una celda.
 * Mientras hay pocas respuestas reales se mezcla con un prior basado en la fama del jugador, para que
 * elegir a Messi no dé "1%" el primer día. A medida que juega más gente domina el dato real.
 */
export function rarityPercent(playerId: string, validAnswers: string[], counts: Map<string, number>, index: FootballIndex): number {
  const fame = new Map(validAnswers.map((id) => [id, index.fame(id)]));
  const totalFame = [...fame.values()].reduce((s, f) => s + f, 0) || 1;
  const totalPicks = [...counts.values()].reduce((s, c) => s + c, 0);
  const prior = (fame.get(playerId) ?? 1) / totalFame;
  const pct = (((counts.get(playerId) ?? 0) + PRIOR_WEIGHT * prior) / (totalPicks + PRIOR_WEIGHT)) * 100;
  return Math.max(1, Math.min(100, Math.round(pct)));
}

/** Puntaje de rareza de la grilla: suma de porcentajes + 100 por celda vacía. Menor es mejor. */
export function rarityScore(percents: (number | null)[]): number {
  return percents.reduce<number>((sum, p) => sum + (p ?? 100), 0);
}
