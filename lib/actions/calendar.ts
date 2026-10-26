"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/session";
import { blockContent, publishManually, regenerate, saveSettings, unblockContent } from "@/lib/game-engine/daily/admin-service";
import { runDailyEngine } from "@/lib/game-engine/daily/service";
import type { Difficulty } from "@/lib/game-engine/daily/types";
import { clearChallengeCache } from "@/lib/game-engine/load-challenge";
import { DAILY_GAMES, type GameSlug } from "@/lib/games/registry";
import type { AdminActionState } from "./admin";

const gameSchema = z.enum(DAILY_GAMES.map((g) => g.slug) as [GameSlug, ...GameSlug[]]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const difficultySchema = z.coerce.number().int().min(1).max(3);

async function run(fn: () => Promise<string>, paths: string[] = ["/admin/calendario"]): Promise<AdminActionState> {
  try {
    await assertAdmin();
    const message = await fn();
    clearChallengeCache();
    paths.forEach((p) => revalidatePath(p));
    return { ok: true, message };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Error desconocido" };
  }
}

const field = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

export async function runEngineNow(): Promise<AdminActionState> {
  return run(async () => {
    const { days, reserves } = await runDailyEngine();
    const created = days.filter((d) => d.status !== "exists" && d.status !== "failed").length;
    const failed = days.filter((d) => d.status === "failed").length;
    return `Motor ejecutado: ${created} desafíos nuevos, ${failed} fallidos, ${Object.values(reserves).reduce((a, b) => a + b, 0)} reservas repuestas`;
  });
}

export async function regenerateDaily(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const user = await assertAdmin();
    const game = gameSchema.parse(field(form, "game"));
    const date = dateSchema.parse(field(form, "date"));
    const difficulty = field(form, "difficulty") ? (difficultySchema.parse(field(form, "difficulty")) as Difficulty) : undefined;
    const reason = field(form, "overrideReason");
    if (reason !== undefined && field(form, "confirm") !== "CAMBIAR") throw new Error('Para un override escribí "CAMBIAR" en la confirmación');
    const report = await regenerate(game, date, { difficulty, override: reason ? { reason, by: user.email } : undefined });
    if (report.status === "failed") throw new Error(`No se pudo regenerar: ${report.errors?.join("; ")}`);
    return `Regenerado (${report.status}, dificultad ${report.difficulty})`;
  }, ["/admin/calendario", `/admin/calendario/${field(form, "game")}/${field(form, "date")}`]);
}

export async function updateSettings(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const game = gameSchema.parse(field(form, "game"));
    const settings = z
      .object({
        repeatWindowDays: z.coerce.number().int().min(0).max(365),
        softRepeatDays: z.coerce.number().int().min(0).max(120),
        minDifficulty: difficultySchema,
        maxDifficulty: difficultySchema,
        targetDifficulty: difficultySchema,
        horizonDays: z.coerce.number().int().min(1).max(90),
        reserveSize: z.coerce.number().int().min(0).max(30),
      })
      .refine((s) => s.minDifficulty <= s.targetDifficulty && s.targetDifficulty <= s.maxDifficulty, "La dificultad objetivo tiene que estar entre la mínima y la máxima")
      .parse(Object.fromEntries(form));
    await saveSettings(game, settings);
    return "Configuración guardada (aplica a los desafíos que se generen de ahora en más)";
  });
}

export async function blockKey(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const key = z.string().regex(/^(player|club|cond|competition):[\w-]+$/).parse(field(form, "key"));
    const scope = field(form, "scope") === "*" ? "*" : gameSchema.parse(field(form, "game"));
    const reports = await blockContent(scope, key, field(form, "label"), field(form, "reason"));
    return `Bloqueado. ${reports.length} diarios futuros regenerados.`;
  });
}

export async function unblock(form: FormData): Promise<void> {
  await assertAdmin();
  await unblockContent(z.string().min(5).parse(field(form, "id")));
  revalidatePath("/admin/calendario");
}

export async function publishChallenge(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const user = await assertAdmin();
    const challengeId = z.string().min(5).parse(field(form, "challengeId"));
    const date = dateSchema.parse(field(form, "date"));
    const reason = field(form, "overrideReason");
    if (reason !== undefined && field(form, "confirm") !== "CAMBIAR") throw new Error('Para un override escribí "CAMBIAR" en la confirmación');
    const status = await publishManually(challengeId, date, reason ? { reason, by: user.email } : undefined);
    return status === "created" ? `Publicado para el ${date}` : "Ese día ya tenía desafío";
  }, ["/admin/calendario", "/admin/desafios"]);
}
