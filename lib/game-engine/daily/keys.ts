import { isAnd, isLeaf, isNot, isOr, type Condition } from "../conditions";

/** Hash FNV-1a de 32 bits en base36: corto, estable y sin dependencias (sirve en tests y en el edge). */
export function shortHash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** JSON con claves ordenadas: la misma condición siempre produce la misma clave. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => v !== undefined && k !== "label")
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export const conditionKey = (c: Condition) => `cond:${shortHash(stableStringify(c))}`;
export const playerKey = (id: string) => `player:${id}`;
export const clubKey = (id: string) => `club:${id}`;

/**
 * Claves "parciales" (un cruce del Grid, un impostor, una ronda): se evitan durante la ventana corta.
 * El resto (grilla entera, jugador de ¿Quién es?, once completo) usa la ventana larga.
 */
const SOFT_PREFIXES = ["pair:", "impostor:", "round:"];
export const isSoftKey = (key: string) => SOFT_PREFIXES.some((p) => key.startsWith(p));

export function fingerprint(parts: string[]): string {
  return shortHash([...parts].sort().join("|"));
}

/** Entidades mencionadas en una condición (para bloquear un club o jugador en todos los desafíos). */
export function entityKeys(c: Condition): string[] {
  if (isAnd(c)) return c.AND.flatMap(entityKeys);
  if (isOr(c)) return c.OR.flatMap(entityKeys);
  if (isNot(c)) return entityKeys(c.NOT);
  if (!isLeaf(c)) return [];
  const keys: string[] = [];
  if ("club" in c && c.club) keys.push(clubKey(c.club));
  if (c.type === "TEAMMATE_WITH") keys.push(playerKey(c.player));
  if (c.type === "WON_COMPETITION" || c.type === "PLAYED_COMPETITION") keys.push(`competition:${c.competition}`);
  return keys;
}
