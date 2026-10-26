import { normalizeText } from "@/lib/text";
import type {
  ClubRecord,
  CoachRecord,
  CoachStintRecord,
  CompetitionRecord,
  FootballDataset,
  MatchLineupRecord,
  MatchRecord,
  NationalTeamRecord,
  PlayerAchievementRecord,
  PlayerClubRecord,
  PlayerNationalTeamRecord,
  PlayerRecord,
  PlayerSummary,
} from "@/types/football";

const CURRENT_YEAR = 2026;

/** Rango de años semiabierto [desde, hasta). Un paso "2018-2018" cuenta como [2018, 2019). */
export function yearRange(from?: number | null, to?: number | null): [number, number] | null {
  if (from == null) return null;
  const end = to == null ? CURRENT_YEAR + 1 : to;
  return [from, end <= from ? from + 1 : end];
}

export function rangesOverlap(a: [number, number] | null, b: [number, number] | null): boolean {
  if (!a || !b) return false;
  return a[0] < b[1] && b[0] < a[1];
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/**
 * Índice en memoria sobre el dataset. Toda la lógica de los juegos consulta relaciones a través
 * de esta clase: nunca se compara contra strings escritos en el frontend.
 */
export class FootballIndex {
  readonly players: PlayerRecord[];
  readonly clubs: ClubRecord[];
  readonly competitions: CompetitionRecord[];
  readonly nationalTeams: NationalTeamRecord[];
  readonly coaches: CoachRecord[];
  readonly matches: MatchRecord[];

  private playerById = new Map<string, PlayerRecord>();
  private clubById = new Map<string, ClubRecord>();
  private competitionById = new Map<string, CompetitionRecord>();
  private nationalTeamById = new Map<string, NationalTeamRecord>();
  private coachById = new Map<string, CoachRecord>();
  private matchById = new Map<string, MatchRecord>();

  private stintsByPlayer: Map<string, PlayerClubRecord[]>;
  private stintsByClub: Map<string, PlayerClubRecord[]>;
  private achievementsByPlayer: Map<string, PlayerAchievementRecord[]>;
  private nationalTeamsByPlayer: Map<string, PlayerNationalTeamRecord[]>;
  private coachStintsByCoach: Map<string, CoachStintRecord[]>;
  private lineupsByPlayer: Map<string, MatchLineupRecord[]>;
  private lineupsByMatch: Map<string, MatchLineupRecord[]>;

  constructor(readonly dataset: FootballDataset) {
    this.players = dataset.players;
    this.clubs = dataset.clubs;
    this.competitions = dataset.competitions;
    this.nationalTeams = dataset.nationalTeams;
    this.coaches = dataset.coaches;
    this.matches = dataset.matches;

    for (const p of dataset.players) this.playerById.set(p.id, p);
    for (const c of dataset.clubs) this.clubById.set(c.id, c);
    for (const c of dataset.competitions) this.competitionById.set(c.id, c);
    for (const n of dataset.nationalTeams) this.nationalTeamById.set(n.id, n);
    for (const c of dataset.coaches) this.coachById.set(c.id, c);
    for (const m of dataset.matches) this.matchById.set(m.id, m);

    this.stintsByPlayer = groupBy(dataset.playerClubs, (s) => s.playerId);
    this.stintsByClub = groupBy(dataset.playerClubs, (s) => s.clubId);
    this.achievementsByPlayer = groupBy(dataset.playerAchievements, (a) => a.playerId);
    this.nationalTeamsByPlayer = groupBy(dataset.playerNationalTeams, (n) => n.playerId);
    this.coachStintsByCoach = groupBy(dataset.coachStints, (s) => s.coachId);
    this.lineupsByPlayer = groupBy(dataset.lineups, (l) => l.playerId);
    this.lineupsByMatch = groupBy(dataset.lineups, (l) => l.matchId);
  }

  // ── Lookups ──
  player(id: string) {
    return this.playerById.get(id);
  }
  club(id: string) {
    return this.clubById.get(id);
  }
  competition(id: string) {
    return this.competitionById.get(id);
  }
  nationalTeam(id: string) {
    return this.nationalTeamById.get(id);
  }
  coach(id: string) {
    return this.coachById.get(id);
  }
  match(id: string) {
    return this.matchById.get(id);
  }

  /** Resuelve por id o por nombre ("River Plate", "river"). Útil para condiciones escritas a mano. */
  resolveClubId(ref: string): string | undefined {
    if (this.clubById.has(ref)) return ref;
    const n = normalizeText(ref);
    return this.clubs.find((c) => normalizeText(c.name) === n || normalizeText(c.shortName) === n)?.id;
  }
  resolveCompetitionId(ref: string): string | undefined {
    if (this.competitionById.has(ref)) return ref;
    const n = normalizeText(ref);
    return this.competitions.find((c) => normalizeText(c.name) === n || normalizeText(c.shortName) === n)?.id;
  }
  resolveNationalTeamId(ref: string): string | undefined {
    if (this.nationalTeamById.has(ref.toUpperCase())) return ref.toUpperCase();
    const n = normalizeText(ref);
    return this.nationalTeams.find((t) => normalizeText(t.name) === n)?.id;
  }
  resolvePlayerId(ref: string): string | undefined {
    if (this.playerById.has(ref)) return ref;
    const n = normalizeText(ref);
    return this.players.find((p) => normalizeText(p.fullName) === n || (p.shortName && normalizeText(p.shortName) === n))?.id;
  }
  resolveCoachId(ref: string): string | undefined {
    if (this.coachById.has(ref)) return ref;
    const n = normalizeText(ref);
    return this.coaches.find((c) => normalizeText(c.fullName) === n)?.id;
  }

  // ── Relaciones ──
  stints(playerId: string): PlayerClubRecord[] {
    return this.stintsByPlayer.get(playerId) ?? [];
  }
  /** Pasos como profesional (excluye pasos sólo de inferiores). */
  seniorStints(playerId: string): PlayerClubRecord[] {
    return this.stints(playerId).filter((s) => !s.isYouth);
  }
  playersOfClub(clubId: string): string[] {
    return [...new Set((this.stintsByClub.get(clubId) ?? []).filter((s) => !s.isYouth).map((s) => s.playerId))];
  }
  achievements(playerId: string): PlayerAchievementRecord[] {
    return this.achievementsByPlayer.get(playerId) ?? [];
  }
  coachStints(coachId: string): CoachStintRecord[] {
    return this.coachStintsByCoach.get(coachId) ?? [];
  }
  lineups(playerId: string): MatchLineupRecord[] {
    return this.lineupsByPlayer.get(playerId) ?? [];
  }
  matchLineup(matchId: string): MatchLineupRecord[] {
    return this.lineupsByMatch.get(matchId) ?? [];
  }

  /** Selecciones mayores: convocatorias declaradas + títulos + partidos registrados. */
  nationalTeamIds(playerId: string): string[] {
    const ids = new Set((this.nationalTeamsByPlayer.get(playerId) ?? []).map((n) => n.nationalTeamId));
    for (const a of this.achievements(playerId)) {
      const comp = this.competition(a.competitionId);
      if (a.nationalTeamId && comp && comp.id !== "u20-world-cup" && comp.id !== "olympics") ids.add(a.nationalTeamId);
    }
    for (const l of this.lineups(playerId)) {
      const m = this.match(l.matchId);
      const side = l.side === "home" ? m?.home : m?.away;
      if (side?.nationalTeamId) ids.add(side.nationalTeamId);
    }
    return [...ids];
  }
  nationalTeamStints(playerId: string): PlayerNationalTeamRecord[] {
    return this.nationalTeamsByPlayer.get(playerId) ?? [];
  }

  hasPlayedFor(playerId: string, clubId: string): boolean {
    return this.seniorStints(playerId).some((s) => s.clubId === clubId);
  }

  positions(playerId: string) {
    const p = this.player(playerId);
    return p ? [p.primaryPosition, ...p.secondaryPositions] : [];
  }

  /** Años de carrera conocidos (primer y último año de paso profesional). */
  careerSpan(playerId: string): [number, number] | null {
    const ranges = this.seniorStints(playerId)
      .map((s) => yearRange(s.fromYear, s.toYear))
      .filter((r): r is [number, number] => r !== null);
    if (!ranges.length) return null;
    return [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1])) - 1];
  }

  summary(playerId: string): PlayerSummary | undefined {
    const p = this.player(playerId);
    if (!p) return undefined;
    return {
      id: p.id,
      name: p.shortName && p.shortName !== p.fullName ? p.shortName : p.fullName,
      nationality: p.nationality,
      positions: [p.primaryPosition, ...p.secondaryPositions],
      imageUrl: p.imageUrl,
      active: p.active,
    };
  }

  displayName(playerId: string): string {
    return this.summary(playerId)?.name ?? playerId;
  }

  /** Popularidad estimada (0-100): se usa como prior de rareza hasta que haya suficientes respuestas reales. */
  fame(playerId: string): number {
    const titles = this.achievements(playerId);
    let score = 1;
    for (const t of titles) {
      if (t.competitionId === "world-cup" && t.result === "WINNER") score += 6;
      else if (t.competitionId === "copa-america" && t.result === "WINNER") score += 2;
      else if (t.competitionId === "libertadores") score += 2;
      else if (t.competitionId === "champions-league") score += 3;
      else score += 1;
    }
    if (this.nationalTeamIds(playerId).length) score += 3;
    for (const s of this.seniorStints(playerId)) {
      const club = this.club(s.clubId);
      if (club?.tier === 1) score += 2;
    }
    const p = this.player(playerId);
    if (p?.active) score += 3;
    return score;
  }
}
