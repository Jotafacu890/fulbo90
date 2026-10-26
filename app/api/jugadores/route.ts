import type { NextRequest } from "next/server";
import { z } from "zod";
import { searchPlayersInDb } from "@/lib/database/player-search";
import { dataSourceKind, getFootballIndex } from "@/lib/database/source";
import { searchPlayers } from "@/lib/search/player-search";

const querySchema = z.string().trim().max(60);

/**
 * GET /api/jugadores?q=julian → resumen público de jugadores (sin datos que revelen respuestas).
 * Con Neon usa el índice trigram; con datos estáticos, la búsqueda en memoria.
 */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return Response.json([], { status: 400 });
  const q = parsed.data;

  let results;
  if (dataSourceKind() === "prisma") {
    results = await searchPlayersInDb(q);
  } else {
    const index = await getFootballIndex();
    results = searchPlayers(index.players, q, 8).map((p) => index.summary(p.id)!);
  }
  return Response.json(results, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
