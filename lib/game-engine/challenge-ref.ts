import { isValidIsoDate } from "./daily";

/**
 * Un desafío se identifica con un token serializable que viaja entre cliente y servidor:
 *  - "daily:2026-10-23"  → desafío diario de esa fecha (seed fijo, o el elegido en /admin)
 *  - "inf:k3j9x2ab"      → modo infinito (seed aleatorio generado en el cliente)
 *  - "db:<id>"           → desafío guardado en la base (curado en /admin / previsualización)
 * El servidor siempre regenera o carga el desafío a partir del token: el cliente nunca recibe las respuestas.
 */
export type ChallengeKind = "daily" | "infinite" | "stored";

export interface ChallengeRef {
  token: string;
  kind: ChallengeKind;
  date?: string;
  seed?: string;
  id?: string;
}

export const dailyToken = (date: string) => `daily:${date}`;
export const infiniteToken = (seed: string) => `inf:${seed}`;
export const storedToken = (id: string) => `db:${id}`;

export function parseChallengeToken(token: string): ChallengeRef | null {
  const [prefix, value] = token.split(":", 2);
  if (!value) return null;
  if (prefix === "daily" && isValidIsoDate(value)) return { token, kind: "daily", date: value };
  if (prefix === "inf" && /^[a-z0-9]{4,24}$/i.test(value)) return { token, kind: "infinite", seed: value };
  if (prefix === "db" && /^[a-z0-9_-]{6,40}$/i.test(value)) return { token, kind: "stored", id: value };
  return null;
}
