"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/session";
import { getPrisma, isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex, invalidateFootballIndex } from "@/lib/database/source";
import { getEngine } from "@/lib/game-engine/games";
import { clearChallengeCache } from "@/lib/game-engine/load-challenge";
import { createRng } from "@/lib/game-engine/rng";
import { normalizeText, slugify } from "@/lib/text";
import { POSITIONS, type Position } from "@/types/football";
import type { AchievementResult, CompetitionType } from "@/lib/generated/prisma/enums";

/**
 * Mutaciones del panel /admin. Requieren PostgreSQL: los datos de /data son de sólo lectura.
 * Después de cada cambio se invalida el índice en memoria para que los juegos lo vean al instante.
 */

export interface AdminActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
};
const bool = (f: FormData, k: string) => f.get(k) === "on";
const position = (v: string | undefined): Position => {
  if (!v || !(POSITIONS as readonly string[]).includes(v)) throw new Error(`Posición inválida: ${v}`);
  return v as Position;
};

// ── Validación de datos (zod): el admin no puede guardar registros inconsistentes ──
const slug = z.string().regex(/^[a-z0-9-]{2,80}$/, "Id inválido: usá minúsculas, números y guiones");
const year = z.number().int().min(1870, "Año fuera de rango").max(2100, "Año fuera de rango");
const country = z.string().regex(/^[A-Z]{2}$/, "País inválido (código de 2 letras)");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (formato #RRGGBB)");
const httpsUrl = z.string().url("URL inválida").startsWith("https://", "La URL debe ser https");

const playerSchema = z.object({
  id: slug,
  fullName: z.string().min(2).max(80),
  shortName: z.string().max(60).nullable(),
  nationality: country,
  secondNationality: country.nullable(),
  birthDate: z.date().max(new Date(), "Fecha de nacimiento en el futuro").nullable(),
  imageUrl: httpsUrl.nullable(),
});
const clubSchema = z.object({
  id: slug,
  name: z.string().min(2).max(80),
  country,
  foundedYear: year.nullable(),
  primaryColor: color.nullable(),
  secondaryColor: color.nullable(),
  tier: z.number().int().min(1).max(3),
  logoUrl: httpsUrl.nullable(),
});
const stintSchema = z
  .object({ fromYear: year.optional(), toYear: year.optional(), appearances: z.number().int().min(0).max(2000).optional(), goals: z.number().int().min(0).max(1500).optional() })
  .refine((s) => !s.fromYear || !s.toYear || s.toYear >= s.fromYear, "El año de salida es anterior al de llegada");

function check<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return parsed.data;
}

async function guard(): Promise<void> {
  await assertAdmin();
  if (!isDatabaseConfigured()) throw new Error("Configurá DATABASE_URL para editar datos (el modo estático es de sólo lectura).");
}

async function run(fn: () => Promise<string | void>, path?: string): Promise<AdminActionState> {
  try {
    await guard();
    const message = await fn();
    invalidateFootballIndex();
    clearChallengeCache();
    if (path) revalidatePath(path);
    return { ok: true, message: message || "Guardado" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// ── Jugadores ──

export async function savePlayer(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  let savedId = "";
  const result = await run(async () => {
    const fullName = str(form, "fullName");
    if (!fullName) throw new Error("El nombre es obligatorio");
    const id = str(form, "id") ?? slugify(fullName);
    const shortName = str(form, "shortName");
    const secondary = form.getAll("secondaryPositions").map(String).map(position);
    const data = {
      fullName,
      shortName: shortName ?? null,
      normalizedName: normalizeText(shortName ? `${fullName} ${shortName}` : fullName),
      nationality: (str(form, "nationality") ?? "AR").toUpperCase(),
      secondNationality: str(form, "secondNationality")?.toUpperCase() ?? null,
      birthDate: str(form, "birthDate") ? new Date(`${str(form, "birthDate")}T00:00:00Z`) : null,
      active: bool(form, "active"),
      primaryPosition: position(str(form, "primaryPosition")),
      secondaryPositions: secondary,
      imageUrl: str(form, "imageUrl") ?? null,
    };
    check(playerSchema, { id, ...data });
    await getPrisma().player.upsert({ where: { id }, create: { id, ...data }, update: data });
    savedId = id;
  }, "/admin/jugadores");
  if (result.ok && !str(form, "id")) redirect(`/admin/jugadores/${savedId}`);
  return result;
}

export async function addPlayerClub(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  const playerId = str(form, "playerId")!;
  return run(async () => {
    const clubId = str(form, "clubId");
    if (!clubId) throw new Error("Elegí un club");
    const numbers = check(stintSchema, { fromYear: int(form, "fromYear"), toYear: int(form, "toYear"), appearances: int(form, "appearances"), goals: int(form, "goals") });
    await getPrisma().playerClub.create({
      data: { playerId, clubId, ...numbers, isYouth: bool(form, "isYouth"), isAcademy: bool(form, "isAcademy") || bool(form, "isYouth"), isLoan: bool(form, "isLoan") },
    });
    return "Paso por el club registrado";
  }, `/admin/jugadores/${playerId}`);
}

export async function deletePlayerClub(form: FormData): Promise<void> {
  await guard();
  await getPrisma().playerClub.delete({ where: { id: str(form, "id")! } });
  invalidateFootballIndex();
  revalidatePath(`/admin/jugadores/${str(form, "playerId")}`);
}

export async function addPlayerTitle(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  const playerId = str(form, "playerId")!;
  return run(async () => {
    const team = str(form, "team");
    const competitionId = str(form, "competitionId");
    const season = int(form, "season");
    if (!competitionId || !season) throw new Error("Competición y temporada son obligatorias");
    check(year, season);
    const isNationalTeam = team ? /^[A-Z]{3}$/.test(team) : false;
    await getPrisma().playerCompetitionAchievement.create({
      data: {
        playerId,
        competitionId,
        season,
        result: (str(form, "result") ?? "WINNER") as AchievementResult,
        clubId: team && !isNationalTeam ? team : null,
        nationalTeamId: team && isNationalTeam ? team : null,
      },
    });
    return "Título registrado";
  }, `/admin/jugadores/${playerId}`);
}

export async function deletePlayerTitle(form: FormData): Promise<void> {
  await guard();
  await getPrisma().playerCompetitionAchievement.delete({ where: { id: str(form, "id")! } });
  invalidateFootballIndex();
  revalidatePath(`/admin/jugadores/${str(form, "playerId")}`);
}

// ── Clubes y competiciones ──

export async function saveClub(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const name = str(form, "name");
    if (!name) throw new Error("El nombre es obligatorio");
    const id = str(form, "id") ?? slugify(name);
    const data = {
      name,
      shortName: str(form, "shortName") ?? name,
      country: (str(form, "country") ?? "AR").toUpperCase(),
      city: str(form, "city") ?? "",
      foundedYear: int(form, "foundedYear") ?? null,
      nickname: str(form, "nickname") ?? null,
      stadium: str(form, "stadium") ?? null,
      primaryColor: str(form, "primaryColor") ?? null,
      secondaryColor: str(form, "secondaryColor") ?? null,
      tier: int(form, "tier") ?? 3,
      logoUrl: str(form, "logoUrl") ?? null,
    };
    check(clubSchema, { id, ...data });
    await getPrisma().club.upsert({ where: { id }, create: { id, ...data }, update: data });
    return `Club ${name} guardado`;
  }, "/admin/clubes");
}

export async function saveCompetition(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const name = str(form, "name");
    if (!name) throw new Error("El nombre es obligatorio");
    const id = str(form, "id") ?? slugify(name);
    const data = {
      name,
      shortName: str(form, "shortName") ?? name,
      region: str(form, "region") ?? "CONMEBOL",
      country: str(form, "country") ?? null,
      type: (str(form, "type") ?? "CLUB_INTERNATIONAL") as CompetitionType,
    };
    await getPrisma().competition.upsert({ where: { id }, create: { id, ...data }, update: data });
    return `Competición ${name} guardada`;
  }, "/admin/competiciones");
}

// ── Partidos y alineaciones ──

export async function saveMatch(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const title = str(form, "title");
    const date = str(form, "date");
    const competitionId = str(form, "competitionId");
    if (!title || !date || !competitionId) throw new Error("Título, fecha y competición son obligatorios");
    const side = (prefix: "home" | "away") => {
      const team = str(form, `${prefix}Team`);
      if (!team) throw new Error("Elegí ambos equipos");
      return /^[A-Z]{3}$/.test(team) ? { [`${prefix}NationalTeamId`]: team } : { [`${prefix}ClubId`]: team };
    };
    const id = str(form, "id") ?? slugify(`${title}-${date}`);
    await getPrisma().match.create({
      data: {
        id,
        title,
        date: new Date(`${date}T00:00:00Z`),
        competitionId,
        season: int(form, "season") ?? Number(date.slice(0, 4)),
        stage: str(form, "stage") ?? "Final",
        venue: str(form, "venue"),
        homeScore: int(form, "homeScore") ?? 0,
        awayScore: int(form, "awayScore") ?? 0,
        homePenalties: int(form, "homePenalties"),
        awayPenalties: int(form, "awayPenalties"),
        homeFormation: str(form, "homeFormation"),
        awayFormation: str(form, "awayFormation"),
        ...side("home"),
        ...side("away"),
      },
    });
    return "Partido creado";
  }, "/admin/partidos");
}

export async function addLineupPlayer(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  const matchId = str(form, "matchId")!;
  return run(async () => {
    const playerId = str(form, "playerId");
    if (!playerId) throw new Error("Elegí un jugador");
    await getPrisma().matchLineup.create({
      data: { matchId, playerId, side: str(form, "side") === "away" ? "away" : "home", position: position(str(form, "position")), starter: bool(form, "starter"), goals: int(form, "goals") ?? 0 },
    });
    return "Jugador agregado a la alineación";
  }, `/admin/partidos/${matchId}`);
}

// ── Desafíos ──

export async function createChallenge(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  return run(async () => {
    const gameId = str(form, "gameId");
    const engine = gameId ? getEngine(gameId) : undefined;
    if (!gameId || !engine) throw new Error("Juego sin motor disponible");
    const index = await getFootballIndex();
    const json = str(form, "payload");
    const seed = str(form, "seed");
    let payload: unknown;
    if (json) {
      try {
        payload = engine.validate(JSON.parse(json), index);
      } catch (e) {
        throw new Error(`Payload inválido: ${e instanceof Error ? e.message : e}`);
      }
    } else {
      payload = engine.generate(index, createRng(`${gameId}:admin:${seed ?? Date.now()}`), { kind: "stored", variant: str(form, "variant") });
    }
    const created = await getPrisma().challenge.create({
      data: { gameId, title: str(form, "title"), mode: "CURATED", status: "PUBLISHED", seed, payload: JSON.parse(JSON.stringify(payload)) },
    });
    return `Desafío ${created.id} creado`;
  }, "/admin/desafios");
}
