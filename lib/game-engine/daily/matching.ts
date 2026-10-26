/**
 * Matching bipartito (Kuhn): ¿cuántos casilleros se pueden cubrir con jugadores distintos?
 * Para el Grid tiene que dar 9: garantiza que exista una solución completa.
 */
export function maxDistinctAssignment(options: string[][]): number {
  const owner = new Map<string, number>();
  const tryAssign = (slot: number, seen: Set<string>): boolean => {
    for (const p of options[slot]) {
      if (seen.has(p)) continue;
      seen.add(p);
      const current = owner.get(p);
      if (current === undefined || tryAssign(current, seen)) {
        owner.set(p, slot);
        return true;
      }
    }
    return false;
  };
  let matched = 0;
  options.forEach((_, i) => {
    if (tryAssign(i, new Set())) matched++;
  });
  return matched;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
