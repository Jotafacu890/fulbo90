import "server-only";
import type { FootballDataset, Position } from "@/types/football";
import { getPrisma } from "./prisma";

const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);

/** Carga todo el grafo futbolístico desde PostgreSQL y lo mapea al modelo del motor. */
export async function loadDatasetFromDatabase(): Promise<FootballDataset> {
  const db = getPrisma();
  const [players, clubs, playerClubs, competitions, playerAchievements, clubAchievements, nationalTeams, playerNationalTeams, coaches, coachStints, matches, lineups] =
    await Promise.all([
      db.player.findMany(),
      db.club.findMany(),
      db.playerClub.findMany(),
      db.competition.findMany(),
      db.playerCompetitionAchievement.findMany(),
      db.clubAchievement.findMany(),
      db.nationalTeam.findMany(),
      db.playerNationalTeam.findMany(),
      db.coach.findMany(),
      db.coachStint.findMany(),
      db.match.findMany(),
      db.matchLineup.findMany(),
    ]);

  return {
    players: players.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      shortName: opt(p.shortName),
      normalizedName: p.normalizedName,
      nationality: p.nationality,
      secondNationality: opt(p.secondNationality),
      birthDate: isoDate(p.birthDate),
      active: p.active,
      primaryPosition: p.primaryPosition as Position,
      secondaryPositions: p.secondaryPositions as Position[],
      imageUrl: opt(p.imageUrl),
    })),
    clubs: clubs.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      country: c.country,
      city: c.city,
      foundedYear: opt(c.foundedYear),
      nickname: opt(c.nickname),
      stadium: opt(c.stadium),
      primaryColor: opt(c.primaryColor),
      secondaryColor: opt(c.secondaryColor),
      tier: c.tier,
      logoUrl: opt(c.logoUrl),
    })),
    playerClubs: playerClubs.map((s) => ({
      playerId: s.playerId,
      clubId: s.clubId,
      fromYear: opt(s.fromYear),
      toYear: s.toYear,
      isYouth: s.isYouth,
      isAcademy: s.isAcademy,
      isLoan: s.isLoan,
      appearances: opt(s.appearances),
      goals: opt(s.goals),
    })),
    competitions: competitions.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName, region: c.region, country: opt(c.country), type: c.type })),
    playerAchievements: playerAchievements.map((a) => ({
      playerId: a.playerId,
      competitionId: a.competitionId,
      season: a.season,
      result: a.result,
      clubId: opt(a.clubId),
      nationalTeamId: opt(a.nationalTeamId),
    })),
    clubAchievements: clubAchievements.map((a) => ({ clubId: a.clubId, competitionId: a.competitionId, season: a.season, result: a.result })),
    nationalTeams: nationalTeams.map((n) => ({ id: n.id, name: n.name, country: n.country, confederation: n.confederation })),
    playerNationalTeams: playerNationalTeams.map((n) => ({
      playerId: n.playerId,
      nationalTeamId: n.nationalTeamId,
      fromYear: opt(n.fromYear),
      toYear: n.toYear,
      caps: opt(n.caps),
      goals: opt(n.goals),
    })),
    coaches: coaches.map((c) => ({ id: c.id, fullName: c.fullName, nationality: c.nationality, playerId: opt(c.playerId) })),
    coachStints: coachStints.map((s) => ({
      coachId: s.coachId,
      clubId: opt(s.clubId),
      nationalTeamId: opt(s.nationalTeamId),
      fromYear: s.fromYear,
      toYear: s.toYear,
    })),
    matches: matches.map((m) => ({
      id: m.id,
      title: m.title,
      date: isoDate(m.date)!,
      competitionId: m.competitionId,
      season: m.season,
      stage: m.stage,
      venue: opt(m.venue),
      home: { clubId: opt(m.homeClubId), nationalTeamId: opt(m.homeNationalTeamId) },
      away: { clubId: opt(m.awayClubId), nationalTeamId: opt(m.awayNationalTeamId) },
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePenalties: opt(m.homePenalties),
      awayPenalties: opt(m.awayPenalties),
      homeFormation: opt(m.homeFormation),
      awayFormation: opt(m.awayFormation),
    })),
    lineups: lineups.map((l) => ({
      matchId: l.matchId,
      playerId: l.playerId,
      side: l.side === "away" ? "away" : "home",
      starter: l.starter,
      position: l.position as Position,
      goals: l.goals,
    })),
  };
}
