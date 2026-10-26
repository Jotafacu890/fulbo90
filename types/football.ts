/**
 * Modelo de datos en memoria que consume el motor de juegos.
 * Es independiente de la fuente (archivos estáticos de /data o PostgreSQL vía Prisma):
 * cada DataSource se encarga de mapear sus filas a esta forma.
 */

export const POSITIONS = ["ARQ", "LD", "DFC", "LI", "MCD", "MC", "MCO", "MD", "MI", "ED", "EI", "DC"] as const;
export type Position = (typeof POSITIONS)[number];

export type CompetitionType = "CLUB_INTERNATIONAL" | "CLUB_LEAGUE" | "CLUB_CUP" | "NATIONAL_TEAM";
export type AchievementResult = "WINNER" | "RUNNER_UP" | "TOP_SCORER" | "BEST_PLAYER";

export interface PlayerRecord {
  id: string;
  fullName: string;
  /** Nombre con el que se lo conoce ("Enzo Francescoli", "Pity Martínez"). */
  shortName?: string;
  normalizedName: string;
  nationality: string;
  secondNationality?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  active: boolean;
  primaryPosition: Position;
  secondaryPositions: Position[];
  imageUrl?: string;
}

export interface ClubRecord {
  id: string;
  name: string;
  shortName: string;
  country: string;
  city: string;
  foundedYear?: number;
  nickname?: string;
  stadium?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tier: number;
  logoUrl?: string;
}

export interface PlayerClubRecord {
  playerId: string;
  clubId: string;
  fromYear?: number;
  toYear?: number | null;
  isYouth?: boolean;
  isAcademy?: boolean;
  isLoan?: boolean;
  appearances?: number;
  goals?: number;
}

export interface CompetitionRecord {
  id: string;
  name: string;
  shortName: string;
  region: string;
  country?: string;
  type: CompetitionType;
}

export interface PlayerAchievementRecord {
  playerId: string;
  competitionId: string;
  season: number;
  result: AchievementResult;
  clubId?: string;
  nationalTeamId?: string;
}

export interface ClubAchievementRecord {
  clubId: string;
  competitionId: string;
  season: number;
  result: AchievementResult;
}

export interface NationalTeamRecord {
  id: string;
  name: string;
  country: string;
  confederation: string;
}

export interface PlayerNationalTeamRecord {
  playerId: string;
  nationalTeamId: string;
  fromYear?: number;
  toYear?: number | null;
  caps?: number;
  goals?: number;
}

export interface CoachRecord {
  id: string;
  fullName: string;
  nationality: string;
  playerId?: string;
}

export interface CoachStintRecord {
  coachId: string;
  clubId?: string;
  nationalTeamId?: string;
  fromYear: number;
  toYear?: number | null;
}

export interface MatchSide {
  clubId?: string;
  nationalTeamId?: string;
}

export interface MatchRecord {
  id: string;
  title: string;
  date: string;
  competitionId: string;
  season: number;
  stage: string;
  venue?: string;
  home: MatchSide;
  away: MatchSide;
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  homeFormation?: string;
  awayFormation?: string;
}

export interface MatchLineupRecord {
  matchId: string;
  playerId: string;
  side: "home" | "away";
  starter: boolean;
  position: Position;
  goals: number;
}

export interface FootballDataset {
  players: PlayerRecord[];
  clubs: ClubRecord[];
  playerClubs: PlayerClubRecord[];
  competitions: CompetitionRecord[];
  playerAchievements: PlayerAchievementRecord[];
  clubAchievements: ClubAchievementRecord[];
  nationalTeams: NationalTeamRecord[];
  playerNationalTeams: PlayerNationalTeamRecord[];
  coaches: CoachRecord[];
  coachStints: CoachStintRecord[];
  matches: MatchRecord[];
  lineups: MatchLineupRecord[];
}

/** Lo que el cliente necesita saber de un jugador para buscarlo y ubicarlo. No revela respuestas. */
export interface PlayerSummary {
  id: string;
  name: string;
  nationality: string;
  positions: Position[];
  imageUrl?: string;
  active: boolean;
}
