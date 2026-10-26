import { countryName, demonym, EUROPE } from "@/lib/countries";
import type { FootballIndex } from "../dataset/football-index";
import { GROUP_LABELS, POSITION_GROUPS, POSITION_LABELS, type PositionGroup } from "../positions";
import { evaluate } from "./evaluate";
import { isAnd, isLeaf, isNot, isOr, type Condition, type LeafCondition } from "./types";

const COMPETITION_PHRASE: Record<string, string> = {
  "world-cup": "el Mundial",
  "copa-america": "la Copa América",
  libertadores: "la Libertadores",
  sudamericana: "la Sudamericana",
  intercontinental: "la Intercontinental",
  "club-world-cup": "el Mundial de Clubes",
  "champions-league": "la Champions",
  "liga-ar": "la Primera División",
  "primera-nacional": "la Primera Nacional",
  "copa-argentina": "la Copa Argentina",
  brasileirao: "el Brasileirão",
  olympics: "el oro olímpico",
  "u20-world-cup": "el Mundial Sub-20",
};

export function competitionPhrase(id: string, index: FootballIndex): string {
  return COMPETITION_PHRASE[id] ?? `la ${index.competition(id)?.shortName ?? id}`;
}

export function nationalTeamPhrase(id: string, index: FootballIndex): string {
  if (id === "ARG") return "la Selección Argentina";
  return `la selección de ${index.nationalTeam(id)?.name ?? id}`;
}

const clubName = (id: string, index: FootballIndex) => index.club(id)?.shortName ?? id;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const decadeLabel = (d: number) => (d >= 2000 ? `${d}` : `${String(d).slice(2)}`);

function positionsLabel(positions: string[]): string {
  const group = (Object.keys(POSITION_GROUPS) as PositionGroup[]).find(
    (g) => POSITION_GROUPS[g].length === positions.length && POSITION_GROUPS[g].every((p) => positions.includes(p)),
  );
  if (group) return GROUP_LABELS[group];
  return positions.map((p) => POSITION_LABELS[p as keyof typeof POSITION_LABELS] ?? p).join(" / ");
}

/** Texto en castellano para mostrar una condición ("Ganó la Libertadores con Boca"). */
export function describeCondition(c: Condition, index: FootballIndex): string {
  if (c.label) return c.label;
  if (isAnd(c)) return c.AND.map((x) => describeCondition(x, index)).join(" y ");
  if (isOr(c)) return c.OR.map((x) => describeCondition(x, index)).join(" o ");
  if (isNot(c)) {
    const inner = c.NOT;
    if (isLeaf(inner) && inner.type === "PLAYED_FOR_CLUB") return `Nunca jugó en ${clubName(inner.club, index)}`;
    return `No: ${describeCondition(inner, index)}`;
  }
  return describeLeaf(c, index);
}

function describeLeaf(c: LeafCondition, index: FootballIndex): string {
  switch (c.type) {
    case "PLAYED_FOR_CLUB":
      return `Jugó en ${clubName(c.club, index)}`;
    case "ACADEMY_OF":
      return `Surgido en ${clubName(c.club, index)}`;
    case "PLAYED_FOR_COUNTRY":
      return `Jugó en ${nationalTeamPhrase(c.nationalTeam, index)}`;
    case "NATIONALITY":
      return capitalize(demonym(c.country));
    case "POSITION":
      return positionsLabel(c.positions);
    case "WON_COMPETITION": {
      const comp = competitionPhrase(c.competition, index);
      const verb = c.result === "TOP_SCORER" ? `Goleador de ${comp.replace(/^(el|la) /, "")}` : c.result === "BEST_PLAYER" ? `Mejor jugador de ${comp.replace(/^(el|la) /, "")}` : `Ganó ${comp}`;
      const team = c.club ? ` con ${clubName(c.club, index)}` : c.nationalTeam ? ` con ${index.nationalTeam(c.nationalTeam)?.name ?? c.nationalTeam}` : "";
      return `${verb}${team}${c.season ? ` ${c.season}` : ""}`;
    }
    case "PLAYED_COMPETITION":
      return `Jugó ${competitionPhrase(c.competition, index)}`;
    case "PLAYED_IN_COUNTRY":
      if (c.countries.length === EUROPE.length && EUROPE.every((e) => c.countries.includes(e))) return "Jugó en Europa";
      return `Jugó en ${c.countries.map(countryName).join(" o ")}`;
    case "COACHED_BY":
      return `Dirigido por ${index.coach(c.coach)?.fullName ?? c.coach}`;
    case "TEAMMATE_WITH":
      return `Compañero de ${index.displayName(c.player)}`;
    case "PLAYED_MATCH":
      return `Jugó ${index.match(c.match)?.title ?? c.match}`;
    case "SCORED_IN_MATCH":
      return `Hizo un gol en ${index.match(c.match)?.title ?? c.match}`;
    case "ACTIVE_PLAYER":
      return "En actividad";
    case "RETIRED_PLAYER":
      return "Retirado";
    case "DECADE":
      return `Jugó en los ${decadeLabel(c.decade)}`;
    case "MIN_GOALS":
      return `${c.min}+ goles${c.club ? ` en ${clubName(c.club, index)}` : ""}`;
    case "MIN_APPEARANCES":
      return `${c.min}+ partidos${c.club ? ` en ${clubName(c.club, index)}` : ""}`;
  }
}

function yearsOfClub(playerId: string, clubId: string, index: FootballIndex): string {
  const ranges = index
    .seniorStints(playerId)
    .filter((s) => s.clubId === clubId && s.fromYear)
    .map((s) => (s.toYear == null ? `${s.fromYear}–hoy` : s.toYear === s.fromYear ? `${s.fromYear}` : `${s.fromYear}–${s.toYear}`));
  return ranges.length ? ` (${ranges.join(", ")})` : "";
}

/** Frase con el dato que justifica por qué un jugador cumple o no una condición. Se usa en el Impostor. */
export function explainCondition(c: Condition, playerId: string, index: FootballIndex): string {
  const name = index.displayName(playerId);
  const passes = evaluate(c, playerId, index);
  if (isAnd(c)) {
    const failing = c.AND.find((x) => !evaluate(x, playerId, index));
    return failing ? explainCondition(failing, playerId, index) : c.AND.map((x) => explainCondition(x, playerId, index)).join(" ");
  }
  if (isOr(c)) {
    const passing = c.OR.find((x) => evaluate(x, playerId, index));
    return passing ? explainCondition(passing, playerId, index) : `${name} no cumple: ${describeCondition(c, index).toLowerCase()}.`;
  }
  if (isNot(c)) return passes ? `${name} no cumple "${describeCondition(c.NOT, index)}".` : explainCondition(c.NOT, playerId, index);

  switch (c.type) {
    case "PLAYED_FOR_CLUB":
      return passes ? `${name} jugó en ${clubName(c.club, index)}${yearsOfClub(playerId, c.club, index)}.` : `${name} nunca jugó en ${clubName(c.club, index)}.`;
    case "ACADEMY_OF": {
      if (passes) return `${name} surgió de las inferiores de ${clubName(c.club, index)}.`;
      const academy = index.stints(playerId).find((s) => s.isAcademy);
      const formed = academy ? ` Se formó en ${clubName(academy.clubId, index)}.` : "";
      return index.hasPlayedFor(playerId, c.club)
        ? `${name} jugó en ${clubName(c.club, index)}, pero no salió de sus inferiores.${formed}`
        : `${name} nunca jugó en ${clubName(c.club, index)}.${formed}`;
    }
    case "WON_COMPETITION": {
      const comp = competitionPhrase(c.competition, index);
      const seasons = index
        .achievements(playerId)
        .filter((a) => a.competitionId === c.competition && a.result === (c.result ?? "WINNER") && (!c.club || a.clubId === c.club) && (!c.nationalTeam || a.nationalTeamId === c.nationalTeam))
        .map((a) => a.season);
      if (passes) return `${name} ganó ${comp}${c.club ? ` con ${clubName(c.club, index)}` : ""} (${[...new Set(seasons)].sort().join(", ")}).`;
      if (c.club && index.hasPlayedFor(playerId, c.club)) return `${name} jugó en ${clubName(c.club, index)}, pero no ganó ${comp} con el club.`;
      if (c.club) return `${name} nunca jugó en ${clubName(c.club, index)}.`;
      if (c.nationalTeam && index.nationalTeamIds(playerId).includes(c.nationalTeam)) return `${name} jugó en ${nationalTeamPhrase(c.nationalTeam, index)}, pero no ganó ${comp}.`;
      return `${name} nunca ganó ${comp}.`;
    }
    case "PLAYED_FOR_COUNTRY":
      return passes ? `${name} jugó en ${nationalTeamPhrase(c.nationalTeam, index)}.` : `${name} nunca jugó en ${nationalTeamPhrase(c.nationalTeam, index)}.`;
    case "NATIONALITY": {
      const p = index.player(playerId);
      return passes ? `${name} es ${demonym(c.country)}.` : `${name} es ${demonym(p?.nationality ?? "")}, no ${demonym(c.country)}.`;
    }
    default:
      return passes ? `${name}: ${describeCondition(c, index).toLowerCase()}.` : `${name} no cumple: ${describeCondition(c, index).toLowerCase()}.`;
  }
}
