import "server-only";
import { getPrisma, isDatabaseConfigured } from "./prisma";
import { dataSourceKind } from "./source";

/**
 * Persistencia relacionada a desafíos. Con base de datos usa Prisma; sin ella cae a memoria
 * (suficiente para desarrollo; en Vercel la memoria no se comparte entre instancias).
 */
const dbEnabled = () => isDatabaseConfigured() && dataSourceKind() === "prisma";

export async function getStoredChallenge(id: string): Promise<{ gameId: string; payload: unknown } | null> {
  if (!dbEnabled()) return null;
  const row = await getPrisma().challenge.findUnique({ where: { id } });
  return row ? { gameId: row.gameId, payload: row.payload } : null;
}

// ── Estadísticas de elección (rareza) ──

const memoryPicks = new Map<string, Map<string, number>>();

export async function recordPick(challengeKey: string, cellKey: string, playerId: string): Promise<void> {
  if (dbEnabled()) {
    await getPrisma().answerStat.upsert({
      where: { challengeKey_cellKey_playerId: { challengeKey, cellKey, playerId } },
      create: { challengeKey, cellKey, playerId, count: 1 },
      update: { count: { increment: 1 } },
    });
    return;
  }
  const key = `${challengeKey}|${cellKey}`;
  const cell = memoryPicks.get(key) ?? new Map<string, number>();
  cell.set(playerId, (cell.get(playerId) ?? 0) + 1);
  memoryPicks.set(key, cell);
}

export async function getPickCounts(challengeKey: string, cellKey: string): Promise<Map<string, number>> {
  if (dbEnabled()) {
    const rows = await getPrisma().answerStat.findMany({ where: { challengeKey, cellKey } });
    return new Map(rows.map((r) => [r.playerId, r.count]));
  }
  return new Map(memoryPicks.get(`${challengeKey}|${cellKey}`) ?? []);
}

// ── Resultados de usuarios autenticados ──

export interface UserResultInput {
  userId: string;
  gameId: string;
  challengeKey: string;
  dailyDate?: string;
  score: number;
  maxScore: number;
  timeMs?: number;
  rarity?: number;
}

/**
 * Guarda el resultado una única vez por usuario y desafío. Devuelve false si ya existía
 * (la restricción única userId + challengeKey impide duplicados aunque lleguen dos requests a la vez).
 */
export async function saveUserResult(input: UserResultInput): Promise<boolean> {
  if (!dbEnabled()) return false;
  try {
    await getPrisma().userGameResult.create({
      data: {
        userId: input.userId,
        gameId: input.gameId,
        challengeKey: input.challengeKey,
        dailyDate: input.dailyDate ? new Date(`${input.dailyDate}T00:00:00Z`) : undefined,
        score: input.score,
        maxScore: input.maxScore,
        timeMs: input.timeMs,
        rarity: input.rarity,
      },
    });
    return true;
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") return false;
    throw e;
  }
}

export async function findUserResult(userId: string, challengeKey: string) {
  if (!dbEnabled()) return null;
  return getPrisma().userGameResult.findUnique({ where: { userId_challengeKey: { userId, challengeKey } } });
}

export async function listUserResults(userId: string, take = 20) {
  if (!dbEnabled()) return [];
  return getPrisma().userGameResult.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}
