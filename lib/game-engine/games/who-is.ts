import { countryName } from "@/lib/countries";
import { competitionPhrase } from "../conditions";
import type { FootballIndex } from "../dataset/football-index";
import { POSITION_LABELS } from "../positions";
import type { Rng } from "../rng";
import { ChallengeGenerationError, type GameEngine } from "./types";

export type ClueKind = "nationality" | "position" | "era" | "minor-club" | "title" | "national-team" | "star-club";

export interface Clue {
  kind: ClueKind;
  label: string;
  value: string;
  /** Código de país para mostrar bandera. */
  country?: string;
  clubId?: string;
}

export interface WhoIsPayload {
  version: 1;
  playerId: string;
  clues: Clue[];
}

export interface WhoIsPublic {
  totalClues: number;
}

export const WHO_IS_POINTS = [100, 80, 60, 45, 30, 15];
export const MIN_CLUES = 4;

const TITLE_PRIORITY = ["world-cup", "champions-league", "libertadores", "copa-america", "intercontinental", "olympics", "club-world-cup", "sudamericana", "u20-world-cup", "brasileirao", "copa-argentina"];

/** Pistas de la más vaga a la más reveladora, armadas a partir de las relaciones del jugador. */
export function buildClues(playerId: string, index: FootballIndex): Clue[] {
  const player = index.player(playerId);
  if (!player) return [];
  const clues: Clue[] = [];
  const stints = index.seniorStints(playerId);
  const clubIds = [...new Set(stints.map((s) => s.clubId))];

  clues.push({ kind: "nationality", label: "Nacionalidad", value: countryName(player.nationality), country: player.nationality });
  clues.push({ kind: "position", label: "Posición", value: POSITION_LABELS[player.primaryPosition] });

  const span = index.careerSpan(playerId);
  const birthYear = player.birthDate ? Number(player.birthDate.slice(0, 4)) : undefined;
  if (span || birthYear) {
    const decade = span ? `Debutó en los ${String(Math.floor(span[0] / 10) * 10).replace(/^19/, "")}` : `Nació en ${birthYear}`;
    clues.push({ kind: "era", label: "Época", value: `${decade} · ${player.active ? "En actividad" : "Retirado"}` });
  }

  // Club "menor": el de menos jerarquía (y que no sea el más emblemático).
  const byPrestige = [...clubIds].sort((a, b) => {
    const ca = index.club(a);
    const cb = index.club(b);
    const yearsA = stints.filter((s) => s.clubId === a).reduce((sum, s) => sum + ((s.toYear ?? 2026) - (s.fromYear ?? 2026)), 0);
    const yearsB = stints.filter((s) => s.clubId === b).reduce((sum, s) => sum + ((s.toYear ?? 2026) - (s.fromYear ?? 2026)), 0);
    return (ca?.tier ?? 3) - (cb?.tier ?? 3) || yearsB - yearsA;
  });
  const star = byPrestige[0];
  const minor = byPrestige.length > 1 ? byPrestige[byPrestige.length - 1] : undefined;
  if (minor) {
    const club = index.club(minor)!;
    clues.push({ kind: "minor-club", label: "Pasó por", value: `${club.name} (${countryName(club.country)})`, clubId: club.id });
  }

  const titles = index.achievements(playerId).filter((a) => a.result === "WINNER");
  const top = TITLE_PRIORITY.map((id) => titles.filter((t) => t.competitionId === id)).find((list) => list.length);
  if (top) {
    const comp = competitionPhrase(top[0].competitionId, index);
    const seasons = [...new Set(top.map((t) => t.season))].sort();
    clues.push({ kind: "title", label: "Palmarés", value: `Ganó ${comp}${seasons.length > 1 ? ` ${seasons.length} veces` : ` (${seasons[0]})`}` });
  } else {
    const nts = index.nationalTeamIds(playerId);
    if (nts.length) clues.push({ kind: "national-team", label: "Selección", value: `Jugó en la selección de ${index.nationalTeam(nts[0])?.name}` });
  }

  if (star && star !== minor) {
    const club = index.club(star)!;
    clues.push({ kind: "star-club", label: "Club emblema", value: club.name, clubId: club.id });
  }

  return clues.slice(0, WHO_IS_POINTS.length);
}

function candidatePlayers(index: FootballIndex): string[] {
  return index.players
    .filter((p) => new Set(index.seniorStints(p.id).map((s) => s.clubId)).size >= 3)
    .filter((p) => buildClues(p.id, index).length >= MIN_CLUES + 1)
    .map((p) => p.id);
}

export function generateWhoIs(index: FootballIndex, rng: Rng): WhoIsPayload {
  const pool = candidatePlayers(index);
  if (!pool.length) throw new ChallengeGenerationError("No hay jugadores con datos suficientes para ¿Quién es?");
  // Favorece jugadores reconocibles, sin que siempre salgan los mismos.
  const playerId = rng.weighted(pool, (id) => Math.sqrt(index.fame(id)));
  return { version: 1, playerId, clues: buildClues(playerId, index) };
}

export const whoIsEngine: GameEngine<WhoIsPayload, WhoIsPublic> = {
  slug: "quien-es",
  generate: (index, rng) => generateWhoIs(index, rng),
  validate(payload, index) {
    const p = payload as Partial<WhoIsPayload>;
    if (!p?.playerId || !index.player(p.playerId)) throw new ChallengeGenerationError("Jugador inexistente");
    const clues = Array.isArray(p.clues) && p.clues.length >= MIN_CLUES ? p.clues : buildClues(p.playerId, index);
    if (clues.length < MIN_CLUES) throw new ChallengeGenerationError("El jugador no tiene datos suficientes para generar pistas");
    return { version: 1, playerId: p.playerId, clues };
  },
  toPublic: (payload) => ({ totalClues: payload.clues.length }),
};
