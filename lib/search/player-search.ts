import { normalizeText } from "@/lib/text";

interface Searchable {
  id: string;
  normalizedName: string;
}

/** Distancia de Levenshtein con corte temprano (sólo nos interesan distancias chicas). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

function tokenScore(token: string, words: string[]): number {
  let best = 0;
  const allowed = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
  for (const word of words) {
    if (word === token) return 100;
    if (word.startsWith(token)) best = Math.max(best, 80);
    else if (token.length >= 3 && word.includes(token)) best = Math.max(best, 50);
    else if (allowed) {
      const d = Math.min(editDistance(token, word, allowed), editDistance(token, word.slice(0, token.length), allowed));
      if (d <= allowed) best = Math.max(best, 40 - d * 10);
    }
  }
  return best;
}

/**
 * Búsqueda tolerante: sin mayúsculas ni tildes, por cualquier palabra del nombre o apodo
 * y con tolerancia a 1-2 errores de tipeo. Todas las palabras de la consulta deben coincidir.
 */
export function searchPlayers<T extends Searchable>(players: T[], query: string, limit = 8): T[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const tokens = q.split(" ").filter(Boolean);
  const scored: { player: T; score: number }[] = [];
  for (const player of players) {
    const words = player.normalizedName.split(" ");
    let total = 0;
    for (const token of tokens) {
      const s = tokenScore(token, words);
      if (!s) {
        total = 0;
        break;
      }
      total += s;
    }
    if (total > 0) {
      if (player.normalizedName.startsWith(q)) total += 15;
      scored.push({ player, score: total });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score || a.player.normalizedName.localeCompare(b.player.normalizedName))
    .slice(0, limit)
    .map((s) => s.player);
}
