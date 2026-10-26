import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { GameSlug } from "@/lib/games/registry";
import { dailyToken, infiniteToken, storedToken } from "./challenge-ref";
import { argentinaDate, isValidIsoDate } from "./daily";
import { randomSeed } from "./rng";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export interface GameRequest {
  token: string;
  mode: "daily" | "infinite" | "stored";
  date?: string;
  variant?: string;
  today: string;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Traduce la URL a un desafío:
 *   /juegos/grid                         → diario de hoy
 *   /juegos/grid?fecha=2026-10-20        → diario de un día anterior (archivo)
 *   /juegos/grid?modo=infinito&seed=x    → infinito (sin seed se genera uno y se redirige, así la URL es compartible)
 *   /juegos/grid?desafio=<id>            → desafío guardado en /admin (previsualización)
 */
export async function resolveGameRequest(slug: GameSlug, searchParams: SearchParams, allowedVariants: readonly string[] = []): Promise<GameRequest> {
  const sp = await searchParams;
  await connection();
  const today = argentinaDate();
  const variantParam = first(sp.variante);
  const variant = variantParam && allowedVariants.includes(variantParam) ? variantParam : undefined;

  if (first(sp.modo) === "infinito") {
    const seed = first(sp.seed);
    if (!seed || !/^[a-z0-9]{4,24}$/i.test(seed)) {
      redirect(`/juegos/${slug}?modo=infinito&seed=${randomSeed()}${variant ? `&variante=${variant}` : ""}`);
    }
    return { token: infiniteToken(seed), mode: "infinite", variant, today };
  }

  const stored = first(sp.desafio);
  if (stored) return { token: storedToken(stored), mode: "stored", today };

  const fecha = first(sp.fecha);
  const date = fecha && isValidIsoDate(fecha) && fecha <= today ? fecha : today;
  return { token: dailyToken(date), mode: "daily", date, today };
}
