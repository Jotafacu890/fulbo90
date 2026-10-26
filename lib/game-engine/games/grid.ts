import { EUROPE } from "@/lib/countries";
import { cond, conditionKey, describeCondition, evaluate, findMatchingPlayers, isLeaf, normalizeCondition, type Condition } from "../conditions";
import type { FootballIndex } from "../dataset/football-index";
import type { Rng } from "../rng";
import { ChallengeGenerationError, type GameEngine } from "./types";

export interface GridPayload {
  version: 1;
  rows: Condition[];
  cols: Condition[];
}

export interface GridAxis {
  label: string;
  kind: "club" | "nation" | "trophy" | "other";
  clubId?: string;
  shortName?: string;
  colors?: [string, string];
  country?: string;
}

export interface GridPublic {
  rows: GridAxis[];
  cols: GridAxis[];
  /** Cantidad de respuestas válidas por celda (no revela cuáles). */
  answerCounts: number[][];
}

type Family = "club" | "selection" | "trophy" | "abroad" | "nationality" | "era" | "coach" | "status";
interface Candidate {
  condition: Condition;
  family: Family;
  /** Países que la condición implica (para no cruzar "Jugó en Brasil" con un club brasileño). */
  impliesCountries?: string[];
  weight: number;
}

const MIN_ANSWERS = 2;

function buildCandidates(index: FootballIndex) {
  const clubs: Candidate[] = index.clubs
    .map((club) => ({ club, players: index.playersOfClub(club.id).length }))
    .filter(({ players }) => players >= 7)
    .map(({ club, players }) => ({
      condition: cond.club(club.id),
      family: "club" as const,
      impliesCountries: [club.country],
      // Prioridad al fútbol argentino, después Sudamérica, después Europa.
      weight: (club.country === "AR" ? 3 : ["BR", "UY", "CL", "CO", "PY", "EC"].includes(club.country) ? 1.6 : 1) * Math.min(players, 25),
    }));

  const attributes: Candidate[] = [
    { condition: cond.country("ARG"), family: "selection", weight: 10 },
    { condition: cond.country("URU"), family: "selection", weight: 3 },
    { condition: cond.country("BRA"), family: "selection", weight: 2 },
    { condition: cond.country("COL"), family: "selection", weight: 2 },
    { condition: cond.won("libertadores"), family: "trophy", weight: 10 },
    { condition: cond.won("world-cup"), family: "trophy", weight: 6 },
    { condition: cond.won("copa-america"), family: "trophy", weight: 5 },
    { condition: cond.won("champions-league"), family: "trophy", weight: 5 },
    { condition: cond.won("intercontinental"), family: "trophy", weight: 3 },
    { condition: cond.won("olympics"), family: "trophy", weight: 2 },
    { condition: cond.won("u20-world-cup"), family: "trophy", weight: 2 },
    { condition: cond.won("sudamericana"), family: "trophy", weight: 2 },
    { condition: cond.playedIn(EUROPE, "Jugó en Europa"), family: "abroad", impliesCountries: EUROPE, weight: 8 },
    { condition: cond.playedIn(["ES"]), family: "abroad", impliesCountries: ["ES"], weight: 4 },
    { condition: cond.playedIn(["IT"]), family: "abroad", impliesCountries: ["IT"], weight: 4 },
    { condition: cond.playedIn(["EN"]), family: "abroad", impliesCountries: ["EN"], weight: 3 },
    { condition: cond.playedIn(["BR"]), family: "abroad", impliesCountries: ["BR"], weight: 3 },
    { condition: cond.playedIn(["MX", "US"], "Jugó en México o EE.UU."), family: "abroad", impliesCountries: ["MX", "US"], weight: 2 },
    { condition: cond.nationality("UY"), family: "nationality", weight: 3 },
    { condition: cond.nationality("CO"), family: "nationality", weight: 2 },
    { condition: cond.decade(1980), family: "era", weight: 2 },
    { condition: cond.decade(1990), family: "era", weight: 3 },
    { condition: cond.decade(2000), family: "era", weight: 3 },
    { condition: cond.decade(2020), family: "era", weight: 3 },
    { condition: cond.coachedBy("gallardo-dt"), family: "coach", weight: 3 },
    { condition: cond.coachedBy("bianchi-dt"), family: "coach", weight: 2 },
    { condition: cond.coachedBy("scaloni-dt"), family: "coach", weight: 2 },
    { condition: cond.active(), family: "status", weight: 2 },
    { condition: cond.retired(), family: "status", weight: 1 },
  ];

  return { clubs, attributes };
}

/** ¿Existe una asignación de 9 jugadores distintos? (matching bipartito celda→jugador). */
function hasPerfectMatching(cells: string[][]): boolean {
  const owner = new Map<string, number>();
  const tryCell = (cell: number, seen: Set<string>): boolean => {
    for (const p of cells[cell]) {
      if (seen.has(p)) continue;
      seen.add(p);
      const current = owner.get(p);
      if (current === undefined || tryCell(current, seen)) {
        owner.set(p, cell);
        return true;
      }
    }
    return false;
  };
  return cells.every((_, i) => tryCell(i, new Set()));
}

function cellAnswers(rows: Condition[], cols: Condition[], index: FootballIndex) {
  const rowMatches = rows.map((r) => new Set(findMatchingPlayers(r, index)));
  const colMatches = cols.map((c) => findMatchingPlayers(c, index));
  return rows.map((_, r) => cols.map((_, c) => colMatches[c].filter((p) => rowMatches[r].has(p))));
}

function weightedSample(rng: Rng, items: Candidate[], count: number, accept: (c: Candidate, chosen: Candidate[]) => boolean): Candidate[] | null {
  const chosen: Candidate[] = [];
  let pool = [...items];
  while (chosen.length < count && pool.length) {
    const pick = rng.weighted(pool, (c) => c.weight);
    pool = pool.filter((c) => c !== pick);
    if (accept(pick, chosen)) chosen.push(pick);
  }
  return chosen.length === count ? chosen : null;
}

export function generateGrid(index: FootballIndex, rng: Rng): GridPayload {
  const { clubs, attributes } = buildCandidates(index);
  let best: { payload: GridPayload; score: number } | null = null;

  for (let attempt = 0; attempt < 600; attempt++) {
    const cols = weightedSample(rng, clubs, 3, () => true);
    if (!cols) break;
    const colCountries = new Set(cols.flatMap((c) => c.impliesCountries ?? []));
    // Filas: mezcla de atributos y, a veces, un club.
    const rowPool = rng.next() < 0.45 ? [...attributes, ...clubs.filter((c) => !cols.includes(c))] : attributes;
    const rows = weightedSample(rng, rowPool, 3, (cand, chosen) => {
      if (chosen.some((c) => c.family === cand.family && cand.family !== "trophy")) return false;
      if (chosen.filter((c) => c.family === "club").length && cand.family === "club") return false;
      // Evitar cruces triviales: "Jugó en Brasil" × Flamengo.
      if (cand.impliesCountries?.some((c) => colCountries.has(c)) && cand.family !== "club") return false;
      return true;
    });
    if (!rows) continue;

    const answers = cellAnswers(rows.map((r) => r.condition), cols.map((c) => c.condition), index);
    const counts = answers.flat().map((a) => a.length);
    const min = Math.min(...counts);
    if (min < MIN_ANSWERS) continue;
    if (!hasPerfectMatching(answers.flat())) continue;

    // Puntaje: celdas difíciles pero posibles, sin celdas regaladas.
    const max = Math.max(...counts);
    const score = (min >= 3 ? 10 : 6) - Math.max(0, max - 30) / 5 + rng.next();
    const payload: GridPayload = { version: 1, rows: rows.map((r) => r.condition), cols: cols.map((c) => c.condition) };
    if (!best || score > best.score) best = { payload, score };
    if (min >= 3 && max <= 30) break;
  }

  if (!best) throw new ChallengeGenerationError("No se pudo generar una grilla válida con los datos actuales");
  return best.payload;
}

function axisView(c: Condition, index: FootballIndex): GridAxis {
  const label = describeCondition(c, index);
  if (isLeaf(c) && c.type === "PLAYED_FOR_CLUB") {
    const club = index.club(c.club);
    return {
      label: club?.name ?? label,
      kind: "club",
      clubId: c.club,
      shortName: club?.shortName,
      colors: [club?.primaryColor ?? "#1FA463", club?.secondaryColor ?? "#F5F7F5"],
      country: club?.country,
    };
  }
  if (isLeaf(c) && (c.type === "PLAYED_FOR_COUNTRY" || c.type === "NATIONALITY")) {
    const country = c.type === "NATIONALITY" ? c.country : index.nationalTeam(c.nationalTeam)?.country;
    return { label, kind: "nation", country };
  }
  if (isLeaf(c) && c.type === "WON_COMPETITION") return { label, kind: "trophy" };
  return { label, kind: "other" };
}

export function gradeGridCell(payload: GridPayload, row: number, col: number, playerId: string, index: FootballIndex): boolean {
  const r = payload.rows[row];
  const c = payload.cols[col];
  if (!r || !c) return false;
  return evaluate(r, playerId, index) && evaluate(c, playerId, index);
}

export function gridCellAnswers(payload: GridPayload, row: number, col: number, index: FootballIndex): string[] {
  return cellAnswers([payload.rows[row]], [payload.cols[col]], index)[0][0];
}

export const gridEngine: GameEngine<GridPayload, GridPublic> = {
  slug: "grid",
  generate: (index, rng) => generateGrid(index, rng),
  validate(payload, index) {
    const p = payload as GridPayload;
    if (!p || !Array.isArray(p.rows) || !Array.isArray(p.cols) || p.rows.length !== 3 || p.cols.length !== 3) {
      throw new ChallengeGenerationError("La grilla debe tener 3 filas y 3 columnas");
    }
    const rows = p.rows.map((c) => normalizeCondition(c, index));
    const cols = p.cols.map((c) => normalizeCondition(c, index));
    const keys = [...rows, ...cols].map(conditionKey);
    if (new Set(keys).size !== keys.length) throw new ChallengeGenerationError("Hay condiciones repetidas");
    const answers = cellAnswers(rows, cols, index);
    if (answers.flat().some((a) => a.length === 0)) throw new ChallengeGenerationError("Hay celdas sin ninguna respuesta posible");
    return { version: 1, rows, cols };
  },
  toPublic(payload, index) {
    const answers = cellAnswers(payload.rows, payload.cols, index);
    return {
      rows: payload.rows.map((c) => axisView(c, index)),
      cols: payload.cols.map((c) => axisView(c, index)),
      answerCounts: answers.map((row) => row.map((a) => a.length)),
    };
  },
};
