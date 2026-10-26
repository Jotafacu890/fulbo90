import type { NextRequest } from "next/server";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { runDailyEngine } from "@/lib/game-engine/daily/service";

/** Generar 30 días × 4 juegos la primera vez puede tardar: se da margen a la función. */
export const maxDuration = 300;

/**
 * Vercel Cron (ver vercel.json): revisa el calendario, genera y valida los desafíos que falten
 * para los próximos días (30 por defecto) y repone reservas. Es idempotente: correrlo dos veces
 * no duplica nada. Vercel envía "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return Response.json({ error: "Sin base de datos" }, { status: 500 });
  const { days, reserves } = await runDailyEngine();
  const summary = days.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }), {});
  const failed = days.filter((d) => d.status === "failed");
  return Response.json({ summary, reserves, failed }, { status: failed.length ? 207 : 200 });
}
