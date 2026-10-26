import "server-only";
import { normalizeText } from "@/lib/text";
import type { PlayerSummary, Position } from "@/types/football";
import { getPrisma } from "./prisma";

interface Row {
  id: string;
  fullName: string;
  shortName: string | null;
  nationality: string;
  primaryPosition: Position;
  secondaryPositions: Position[];
  active: boolean;
  imageUrl: string | null;
}

/**
 * Búsqueda en PostgreSQL usando el índice GIN trigram sobre normalizedName:
 * prefijos/substrings con ILIKE y tolerancia a errores con word_similarity (operador <%).
 */
export async function searchPlayersInDb(query: string, limit = 8): Promise<PlayerSummary[]> {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  const rows = await getPrisma().$queryRaw<Row[]>`
    SELECT id, "fullName", "shortName", nationality, "primaryPosition", "secondaryPositions", active, "imageUrl"
    FROM "Player"
    WHERE "normalizedName" ILIKE ${`%${q}%`} OR ${q} <% "normalizedName"
    ORDER BY ("normalizedName" ILIKE ${`${q}%`}) DESC,
             word_similarity(${q}, "normalizedName") DESC,
             "fullName" ASC
    LIMIT ${limit}`;
  return rows.map((p) => ({
    id: p.id,
    name: p.shortName && p.shortName !== p.fullName ? p.shortName : p.fullName,
    nationality: p.nationality,
    positions: [p.primaryPosition, ...p.secondaryPositions],
    active: p.active,
    imageUrl: p.imageUrl ?? undefined,
  }));
}
