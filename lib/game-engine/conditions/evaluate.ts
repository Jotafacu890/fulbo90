import { rangesOverlap, yearRange, type FootballIndex } from "../dataset/football-index";
import { isAnd, isNot, isOr, type Condition, type LeafCondition } from "./types";

/**
 * Motor de condiciones: decide si un jugador cumple una condición consultando sus relaciones.
 * Ejemplo: { AND: [{ type: "PLAYED_FOR_CLUB", club: "river" }, { type: "WON_COMPETITION", competition: "libertadores" }] }
 */
export function evaluate(condition: Condition, playerId: string, index: FootballIndex): boolean {
  if (isAnd(condition)) return condition.AND.every((c) => evaluate(c, playerId, index));
  if (isOr(condition)) return condition.OR.some((c) => evaluate(c, playerId, index));
  if (isNot(condition)) return !evaluate(condition.NOT, playerId, index);
  return evaluateLeaf(condition, playerId, index);
}

export function findMatchingPlayers(condition: Condition, index: FootballIndex): string[] {
  return index.players.filter((p) => evaluate(condition, p.id, index)).map((p) => p.id);
}

function evaluateLeaf(c: LeafCondition, playerId: string, index: FootballIndex): boolean {
  const player = index.player(playerId);
  if (!player) return false;

  switch (c.type) {
    case "PLAYED_FOR_CLUB":
      return index.hasPlayedFor(playerId, c.club);

    case "ACADEMY_OF":
      return index.stints(playerId).some((s) => s.clubId === c.club && s.isAcademy);

    case "PLAYED_FOR_COUNTRY":
      return index.nationalTeamIds(playerId).includes(c.nationalTeam);

    case "NATIONALITY":
      return player.nationality === c.country || player.secondNationality === c.country;

    case "POSITION":
      return index.positions(playerId).some((p) => c.positions.includes(p));

    case "WON_COMPETITION":
      return index
        .achievements(playerId)
        .some(
          (a) =>
            a.competitionId === c.competition &&
            a.result === (c.result ?? "WINNER") &&
            (c.club === undefined || a.clubId === c.club) &&
            (c.nationalTeam === undefined || a.nationalTeamId === c.nationalTeam) &&
            (c.season === undefined || a.season === c.season),
        );

    case "PLAYED_COMPETITION": {
      if (index.achievements(playerId).some((a) => a.competitionId === c.competition)) return true;
      if (index.lineups(playerId).some((l) => index.match(l.matchId)?.competitionId === c.competition)) return true;
      // Para ligas nacionales se infiere a partir del país del club (los clubes del seed son de primera).
      const comp = index.competition(c.competition);
      if (comp?.type === "CLUB_LEAGUE" && comp.country && comp.id !== "primera-nacional") {
        return index.seniorStints(playerId).some((s) => index.club(s.clubId)?.country === comp.country);
      }
      return false;
    }

    case "PLAYED_IN_COUNTRY":
      return index.seniorStints(playerId).some((s) => {
        const country = index.club(s.clubId)?.country;
        return country !== undefined && c.countries.includes(country);
      });

    case "COACHED_BY": {
      const coachStints = index.coachStints(c.coach);
      const ntStints = index.nationalTeamStints(playerId);
      return coachStints.some((cs) => {
        const coachRange = yearRange(cs.fromYear, cs.toYear);
        if (cs.clubId) {
          return index
            .seniorStints(playerId)
            .some((s) => s.clubId === cs.clubId && rangesOverlap(yearRange(s.fromYear, s.toYear), coachRange));
        }
        if (cs.nationalTeamId) {
          const viaStint = ntStints.some(
            (n) => n.nationalTeamId === cs.nationalTeamId && rangesOverlap(yearRange(n.fromYear, n.toYear), coachRange),
          );
          // Un título con la selección durante el ciclo del DT también lo prueba (p. ej. Mundial 2022 con Scaloni).
          const viaTitle = index
            .achievements(playerId)
            .some((a) => a.nationalTeamId === cs.nationalTeamId && rangesOverlap([a.season, a.season + 1], coachRange));
          return viaStint || viaTitle;
        }
        return false;
      });
    }

    case "TEAMMATE_WITH": {
      if (c.player === playerId) return false;
      const other = index.seniorStints(c.player);
      const sameClub = index
        .seniorStints(playerId)
        .some((s) =>
          other.some((o) => o.clubId === s.clubId && rangesOverlap(yearRange(s.fromYear, s.toYear), yearRange(o.fromYear, o.toYear))),
        );
      if (sameClub) return true;
      // Compartir un partido registrado o un título con la misma selección/club en la misma temporada.
      const otherMatches = new Set(index.lineups(c.player).map((l) => `${l.matchId}:${l.side}`));
      if (index.lineups(playerId).some((l) => otherMatches.has(`${l.matchId}:${l.side}`))) return true;
      const otherTitles = new Set(
        index.achievements(c.player).filter((a) => a.result === "WINNER").map((a) => `${a.competitionId}:${a.season}:${a.clubId ?? a.nationalTeamId}`),
      );
      return index
        .achievements(playerId)
        .some((a) => a.result === "WINNER" && otherTitles.has(`${a.competitionId}:${a.season}:${a.clubId ?? a.nationalTeamId}`));
    }

    case "PLAYED_MATCH":
      return index.lineups(playerId).some((l) => l.matchId === c.match);

    case "SCORED_IN_MATCH":
      return index.lineups(playerId).some((l) => l.matchId === c.match && l.goals > 0);

    case "ACTIVE_PLAYER":
      return player.active;

    case "RETIRED_PLAYER":
      return !player.active;

    case "DECADE": {
      const decadeRange: [number, number] = [c.decade, c.decade + 10];
      return index.seniorStints(playerId).some((s) => rangesOverlap(yearRange(s.fromYear, s.toYear), decadeRange));
    }

    case "MIN_GOALS":
    case "MIN_APPEARANCES": {
      const field = c.type === "MIN_GOALS" ? "goals" : "appearances";
      const stints = index.seniorStints(playerId).filter((s) => c.club === undefined || s.clubId === c.club);
      if (!stints.some((s) => s[field] !== undefined)) return false;
      return stints.reduce((sum, s) => sum + (s[field] ?? 0), 0) >= c.min;
    }
  }
}
