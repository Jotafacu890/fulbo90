import { normalizeText } from "@/lib/text";
import type {
  FootballDataset,
  PlayerAchievementRecord,
  PlayerClubRecord,
  PlayerNationalTeamRecord,
  PlayerRecord,
} from "@/types/football";
import { clubs } from "./clubs";
import { coaches, coachStints } from "./coaches";
import { clubAchievements, competitions, nationalTeams } from "./competitions";
import { lineups, matches } from "./matches";
import { argentinaActual } from "./players/argentina-actual";
import { argentinaHistoria } from "./players/argentina-historia";
import { sudamerica } from "./players/sudamerica";
import type { PlayerSeed } from "./seed-types";

export const playerSeeds: PlayerSeed[] = [...argentinaActual, ...argentinaHistoria, ...sudamerica];

const isNationalTeamId = (team: string) => /^[A-Z]{3}$/.test(team);

/** Expande el formato compacto de /data al modelo que usa el motor (y que se inserta en PostgreSQL). */
export function buildStaticDataset(): FootballDataset {
  const players: PlayerRecord[] = [];
  const playerClubs: PlayerClubRecord[] = [];
  const playerAchievements: PlayerAchievementRecord[] = [];
  const playerNationalTeams: PlayerNationalTeamRecord[] = [];

  for (const seed of playerSeeds) {
    const [primaryPosition, ...secondaryPositions] = seed.pos;
    players.push({
      id: seed.id,
      fullName: seed.name,
      shortName: seed.short,
      normalizedName: normalizeText(seed.short ? `${seed.name} ${seed.short}` : seed.name),
      nationality: seed.nat,
      secondNationality: seed.nat2,
      birthDate: seed.born,
      active: seed.active ?? false,
      primaryPosition,
      secondaryPositions,
    });

    for (const [clubId, from, to, flags = ""] of seed.clubs) {
      playerClubs.push({
        playerId: seed.id,
        clubId,
        fromYear: from ?? undefined,
        toYear: to === undefined ? undefined : to,
        isYouth: flags.includes("y"),
        isAcademy: flags.includes("a") || flags.includes("y"),
        isLoan: flags.includes("l"),
      });
    }

    for (const [nationalTeamId, from, to] of seed.nt ?? []) {
      playerNationalTeams.push({ playerId: seed.id, nationalTeamId, fromYear: from ?? undefined, toYear: to ?? undefined });
    }

    for (const [competitionId, season, team, result = "WINNER"] of seed.titles ?? []) {
      playerAchievements.push({
        playerId: seed.id,
        competitionId,
        season,
        result,
        ...(isNationalTeamId(team) ? { nationalTeamId: team } : { clubId: team }),
      });
    }
  }

  return {
    players,
    clubs,
    playerClubs,
    competitions,
    playerAchievements,
    clubAchievements,
    nationalTeams,
    playerNationalTeams,
    coaches,
    coachStints,
    matches,
    lineups,
  };
}
