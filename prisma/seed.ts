/**
 * Seed reproducible: carga /data en PostgreSQL con ids determinísticos.
 *
 *   npm run db:seed                  # idempotente: agrega lo que falta y actualiza entidades, no borra nada
 *   npm run db:seed -- --reset       # además reemplaza las relaciones (trayectorias, títulos…) de los
 *                                    # jugadores/clubes del seed para que queden idénticas a /data
 *
 * Nunca borra jugadores, clubes, desafíos ni resultados: lo creado desde /admin se conserva.
 * --reset se niega a correr en producción salvo con --force-production.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { buildStaticDataset } from "../data";
import { GAMES } from "../lib/games/registry";
import { Prisma, PrismaClient } from "../lib/generated/prisma/client";

const reset = process.argv.includes("--reset");
const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
if (reset && isProduction && !process.argv.includes("--force-production")) {
  console.error("✖ --reset en producción requiere --force-production");
  process.exit(1);
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (o DIRECT_URL / DATABASE_URL_UNPOOLED) en .env");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
const date = (iso?: string) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

/** Ejecuta operaciones en transacciones de a `size` para no hacer cientos de viajes sueltos. */
async function inChunks<T>(items: T[], size: number, op: (item: T) => Prisma.PrismaPromise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await prisma.$transaction(items.slice(i, i + size).map(op), { timeout: 60_000, maxWait: 20_000 });
  }
}

async function main() {
  const ds = buildStaticDataset();
  console.log(`Seed${reset ? " (--reset)" : ""}: ${ds.players.length} jugadores, ${ds.clubs.length} clubes, ${ds.competitions.length} competiciones`);

  // ── Entidades: upsert por id (actualiza con los valores de /data) ──
  await inChunks(GAMES, 50, (g) => {
    const data = { name: g.name, description: g.tagline, icon: g.icon, difficulty: g.difficulty, enabled: g.status === "available", launchDate: date(g.launchDate)!, sortOrder: GAMES.indexOf(g) };
    return prisma.game.upsert({ where: { id: g.slug }, create: { id: g.slug, ...data }, update: data });
  });
  await inChunks(ds.competitions, 50, (c) => {
    const data = { name: c.name, shortName: c.shortName, region: c.region, country: c.country ?? null, type: c.type };
    return prisma.competition.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  });
  await inChunks(ds.competitions, 50, (c) => {
    const data = { name: `Campeón · ${c.name}`, competitionId: c.id, result: "WINNER" as const };
    return prisma.achievement.upsert({ where: { id: `${c.id}-winner` }, create: { id: `${c.id}-winner`, ...data }, update: data });
  });
  await inChunks(ds.nationalTeams, 50, (n) => prisma.nationalTeam.upsert({ where: { id: n.id }, create: n, update: n }));
  await inChunks(ds.clubs, 50, (c) => {
    const data = {
      name: c.name,
      shortName: c.shortName,
      country: c.country,
      city: c.city,
      foundedYear: c.foundedYear ?? null,
      nickname: c.nickname ?? null,
      stadium: c.stadium ?? null,
      primaryColor: c.primaryColor ?? null,
      secondaryColor: c.secondaryColor ?? null,
      tier: c.tier,
      logoUrl: c.logoUrl ?? null,
    };
    return prisma.club.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  });
  await inChunks(ds.players, 50, (p) => {
    const data = {
      fullName: p.fullName,
      shortName: p.shortName ?? null,
      normalizedName: p.normalizedName,
      nationality: p.nationality,
      secondNationality: p.secondNationality ?? null,
      birthDate: date(p.birthDate),
      active: p.active,
      primaryPosition: p.primaryPosition,
      secondaryPositions: p.secondaryPositions,
    };
    return prisma.player.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
  });
  await inChunks(ds.coaches, 50, (c) => {
    const data = { fullName: c.fullName, nationality: c.nationality, playerId: c.playerId ?? null };
    return prisma.coach.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  });
  await inChunks(ds.matches, 50, (m) => {
    const data = {
      title: m.title,
      date: date(m.date)!,
      competitionId: m.competitionId,
      season: m.season,
      stage: m.stage,
      venue: m.venue ?? null,
      homeClubId: m.home.clubId ?? null,
      homeNationalTeamId: m.home.nationalTeamId ?? null,
      awayClubId: m.away.clubId ?? null,
      awayNationalTeamId: m.away.nationalTeamId ?? null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePenalties: m.homePenalties ?? null,
      awayPenalties: m.awayPenalties ?? null,
      homeFormation: m.homeFormation ?? null,
      awayFormation: m.awayFormation ?? null,
    };
    return prisma.match.upsert({ where: { id: m.id }, create: { id: m.id, ...data }, update: data });
  });

  // ── Relaciones de las entidades del seed ──
  const playerIds = ds.players.map((p) => p.id);
  if (reset) {
    await prisma.$transaction([
      prisma.playerClub.deleteMany({ where: { playerId: { in: playerIds } } }),
      prisma.playerCompetitionAchievement.deleteMany({ where: { playerId: { in: playerIds } } }),
      prisma.playerNationalTeam.deleteMany({ where: { playerId: { in: playerIds } } }),
      prisma.clubAchievement.deleteMany({ where: { clubId: { in: ds.clubs.map((c) => c.id) } } }),
      prisma.coachStint.deleteMany({ where: { coachId: { in: ds.coaches.map((c) => c.id) } } }),
      prisma.matchLineup.deleteMany({ where: { matchId: { in: ds.matches.map((m) => m.id) } } }),
    ], { timeout: 60_000, maxWait: 20_000 });
  }

  // Ids determinísticos: volver a correr el seed no duplica filas.
  const stintIndex = new Map<string, number>();
  await prisma.playerClub.createMany({
    skipDuplicates: true,
    data: ds.playerClubs.map((s) => {
      const n = stintIndex.get(s.playerId) ?? 0;
      stintIndex.set(s.playerId, n + 1);
      return {
        id: `${s.playerId}~${n}~${s.clubId}`,
        playerId: s.playerId,
        clubId: s.clubId,
        fromYear: s.fromYear ?? null,
        toYear: s.toYear ?? null,
        isYouth: !!s.isYouth,
        isAcademy: !!s.isAcademy,
        isLoan: !!s.isLoan,
        appearances: s.appearances ?? null,
        goals: s.goals ?? null,
      };
    }),
  });
  await prisma.clubAchievement.createMany({ data: ds.clubAchievements, skipDuplicates: true });
  await prisma.playerCompetitionAchievement.createMany({
    skipDuplicates: true,
    data: ds.playerAchievements.map((a) => ({
      id: [a.playerId, a.competitionId, a.season, a.result, a.clubId ?? a.nationalTeamId ?? "-"].join("~"),
      ...a,
      clubId: a.clubId ?? null,
      nationalTeamId: a.nationalTeamId ?? null,
    })),
  });
  await prisma.playerNationalTeam.createMany({
    skipDuplicates: true,
    data: ds.playerNationalTeams.map((n) => ({ id: `${n.playerId}~${n.nationalTeamId}`, playerId: n.playerId, nationalTeamId: n.nationalTeamId, fromYear: n.fromYear ?? null, toYear: n.toYear ?? null })),
  });
  const coachIndex = new Map<string, number>();
  await prisma.coachStint.createMany({
    skipDuplicates: true,
    data: ds.coachStints.map((s) => {
      const n = coachIndex.get(s.coachId) ?? 0;
      coachIndex.set(s.coachId, n + 1);
      return { id: `${s.coachId}~${n}`, coachId: s.coachId, clubId: s.clubId ?? null, nationalTeamId: s.nationalTeamId ?? null, fromYear: s.fromYear, toYear: s.toYear ?? null };
    }),
  });
  await prisma.matchLineup.createMany({ skipDuplicates: true, data: ds.lineups.map((l) => ({ id: `${l.matchId}~${l.playerId}`, ...l })) });

  console.log("✔ Seed completo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
