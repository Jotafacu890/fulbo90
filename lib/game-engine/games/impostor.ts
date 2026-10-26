import { demonym } from "@/lib/countries";
import type { PlayerSummary } from "@/types/football";
import { cond, evaluate, explainCondition, findMatchingPlayers, normalizeCondition, type Condition } from "../conditions";
import type { FootballIndex } from "../dataset/football-index";
import type { Rng } from "../rng";
import { ChallengeGenerationError, type GameEngine } from "./types";

export interface ImpostorRound {
  prompt: string;
  condition: Condition;
  options: string[];
  impostorId: string;
}

export interface ImpostorPayload {
  version: 1;
  rounds: ImpostorRound[];
}

export interface ImpostorPublic {
  rounds: { prompt: string; options: PlayerSummary[] }[];
}

export const IMPOSTOR_ROUNDS = 5;

/** Rivales clásicos: el mejor impostor es alguien del club de enfrente. */
const RIVALS: Record<string, string> = {
  river: "boca",
  boca: "river",
  racing: "independiente",
  independiente: "racing",
  newells: "rosario-central",
  "rosario-central": "newells",
  estudiantes: "gimnasia-lp",
  "gimnasia-lp": "estudiantes",
  "san-lorenzo": "huracan",
  huracan: "san-lorenzo",
  talleres: "belgrano",
  belgrano: "talleres",
  penarol: "nacional",
  nacional: "penarol",
  palmeiras: "corinthians",
  corinthians: "palmeiras",
  gremio: "internacional",
  internacional: "gremio",
  olimpia: "cerro-porteno",
  "cerro-porteno": "olimpia",
};

interface Template {
  id: string;
  build(index: FootballIndex, rng: Rng, used: Set<string>): ImpostorRound | null;
}

/** Elige 4 que cumplen y 1 que no (de un grupo "creíble"), evitando jugadores ya usados. */
function assemble(
  index: FootballIndex,
  rng: Rng,
  used: Set<string>,
  condition: Condition,
  prompt: string,
  decoyPool: string[],
): ImpostorRound | null {
  const members = rng.shuffle(findMatchingPlayers(condition, index).filter((p) => !used.has(p)));
  if (members.length < 4) return null;
  const decoys = decoyPool.filter((p) => !used.has(p) && !evaluate(condition, p, index));
  if (!decoys.length) return null;
  const impostorId = rng.weighted(decoys, (p) => index.fame(p));
  const chosen = rng
    .shuffle(members)
    .sort((a, b) => index.fame(b) - index.fame(a))
    .slice(0, 8);
  const four = rng.shuffle(chosen).slice(0, 4);
  return { prompt, condition, impostorId, options: rng.shuffle([...four, impostorId]) };
}

const clubsWith = (index: FootballIndex, min: number, filter: (c: Condition) => Condition, countryFilter?: (country: string) => boolean) =>
  index.clubs.filter((c) => (!countryFilter || countryFilter(c.country)) && findMatchingPlayers(filter(cond.club(c.id)), index).length >= min);

const TEMPLATES: Template[] = [
  {
    id: "libertadores-with-club",
    build(index, rng, used) {
      const options = index.clubs.filter((c) => findMatchingPlayers(cond.won("libertadores", { club: c.id }), index).length >= 4);
      if (!options.length) return null;
      const club = rng.pick(options);
      const condition = cond.won("libertadores", { club: club.id });
      // Impostor: jugó en el club pero no la ganó ahí, o la ganó con otro club.
      const decoys = [...index.playersOfClub(club.id), ...findMatchingPlayers(cond.won("libertadores"), index)];
      return assemble(index, rng, used, condition, `Cuatro ganaron la Copa Libertadores con ${club.shortName}. ¿Quién es el impostor?`, decoys);
    },
  },
  {
    id: "played-for-club",
    build(index, rng, used) {
      const options = clubsWith(index, 6, (c) => c, (country) => ["AR", "BR", "UY"].includes(country));
      if (!options.length) return null;
      const club = rng.pick(options);
      const rival = RIVALS[club.id];
      const decoys = rival ? index.playersOfClub(rival) : index.players.filter((p) => p.nationality === club.country).map((p) => p.id);
      return assemble(index, rng, used, cond.club(club.id), `Cuatro jugaron en ${club.name}. ¿Quién nunca vistió esa camiseta?`, decoys);
    },
  },
  {
    id: "world-champion",
    build(index, rng, used) {
      const condition = cond.won("world-cup", { nationalTeam: "ARG" });
      const decoys = index.players.filter((p) => index.nationalTeamIds(p.id).includes("ARG")).map((p) => p.id);
      return assemble(index, rng, used, condition, "Cuatro son campeones del mundo con Argentina. ¿Quién no?", decoys);
    },
  },
  {
    id: "copa-america",
    build(index, rng, used) {
      const teams = index.nationalTeams.filter((t) => findMatchingPlayers(cond.won("copa-america", { nationalTeam: t.id }), index).length >= 4);
      if (!teams.length) return null;
      const team = rng.pick(teams);
      const decoys = index.players.filter((p) => index.nationalTeamIds(p.id).includes(team.id)).map((p) => p.id);
      return assemble(index, rng, used, cond.won("copa-america", { nationalTeam: team.id }), `Cuatro ganaron la Copa América con ${team.name}. ¿Quién es el impostor?`, decoys);
    },
  },
  {
    id: "academy",
    build(index, rng, used) {
      const options = index.clubs.filter((c) => c.country === "AR" && findMatchingPlayers(cond.academy(c.id), index).length >= 5);
      if (!options.length) return null;
      const club = rng.pick(options);
      const decoys = index.playersOfClub(club.id);
      return assemble(index, rng, used, cond.academy(club.id), `Cuatro surgieron de las inferiores de ${club.shortName}. ¿Quién no?`, decoys);
    },
  },
  {
    id: "nationality",
    build(index, rng, used) {
      const countries = ["UY", "CO", "BR", "CL", "PY"].filter((c) => findMatchingPlayers(cond.nationality(c), index).length >= 5);
      if (!countries.length) return null;
      const country = rng.pick(countries);
      const condition = cond.nationality(country);
      // Impostor: alguien de otra nacionalidad que compartió club con alguno de ellos.
      const clubs = new Set(findMatchingPlayers(condition, index).flatMap((p) => index.seniorStints(p).map((s) => s.clubId)));
      const decoys = index.players.filter((p) => index.seniorStints(p.id).some((s) => clubs.has(s.clubId))).map((p) => p.id);
      const plural = demonym(country).replace(/o$/, "os").replace(/eño$/, "eños");
      return assemble(index, rng, used, condition, `Cuatro son ${plural}. ¿Quién es el impostor?`, decoys);
    },
  },
  {
    id: "champions",
    build(index, rng, used) {
      const condition = cond.won("champions-league");
      const decoys = findMatchingPlayers(cond.playedIn(["ES", "IT", "EN", "FR", "DE", "PT"]), index);
      return assemble(index, rng, used, condition, "Cuatro ganaron la Champions League. ¿Quién nunca la levantó?", decoys);
    },
  },
  {
    id: "two-clubs",
    build(index, rng, used) {
      const pairs: [string, string][] = [];
      const arClubs = index.clubs.filter((c) => c.country === "AR" || c.tier === 1);
      for (const a of arClubs) {
        for (const b of arClubs) {
          if (a.id < b.id && findMatchingPlayers(cond.and(cond.club(a.id), cond.club(b.id)), index).length >= 4) pairs.push([a.id, b.id]);
        }
      }
      if (!pairs.length) return null;
      const [a, b] = rng.pick(pairs);
      const condition = cond.and(cond.club(a), cond.club(b));
      const decoys = [...index.playersOfClub(a), ...index.playersOfClub(b)];
      return assemble(index, rng, used, condition, `Cuatro jugaron en ${index.club(a)!.shortName} y en ${index.club(b)!.shortName}. ¿Quién sólo jugó en uno?`, decoys);
    },
  },
];

export function generateImpostor(index: FootballIndex, rng: Rng): ImpostorPayload {
  const rounds: ImpostorRound[] = [];
  const used = new Set<string>();
  for (const template of rng.shuffle(TEMPLATES)) {
    if (rounds.length === IMPOSTOR_ROUNDS) break;
    const round = template.build(index, rng, used);
    if (!round) continue;
    rounds.push(round);
    round.options.forEach((p) => used.add(p));
  }
  if (rounds.length < IMPOSTOR_ROUNDS) throw new ChallengeGenerationError("No se pudieron armar 5 rondas de Impostor");
  return { version: 1, rounds };
}

export function explainImpostor(round: ImpostorRound, index: FootballIndex): { impostor: string; members: string[] } {
  return {
    impostor: explainCondition(round.condition, round.impostorId, index),
    members: round.options.filter((p) => p !== round.impostorId).map((p) => explainCondition(round.condition, p, index)),
  };
}

export const impostorEngine: GameEngine<ImpostorPayload, ImpostorPublic> = {
  slug: "impostor",
  generate: (index, rng) => generateImpostor(index, rng),
  validate(payload, index) {
    const p = payload as Partial<ImpostorPayload>;
    if (!Array.isArray(p?.rounds) || !p.rounds.length) throw new ChallengeGenerationError("El impostor necesita al menos una ronda");
    const rounds = p.rounds.map((r, i) => {
      const condition = normalizeCondition(r.condition, index);
      if (!Array.isArray(r.options) || r.options.length !== 5) throw new ChallengeGenerationError(`Ronda ${i + 1}: deben ser 5 jugadores`);
      if (!r.options.includes(r.impostorId)) throw new ChallengeGenerationError(`Ronda ${i + 1}: el impostor no está entre las opciones`);
      for (const id of r.options) {
        if (!index.player(id)) throw new ChallengeGenerationError(`Ronda ${i + 1}: jugador inexistente ${id}`);
        const ok = evaluate(condition, id, index);
        if (id === r.impostorId ? ok : !ok) {
          throw new ChallengeGenerationError(`Ronda ${i + 1}: ${index.displayName(id)} ${ok ? "cumple" : "no cumple"} la condición según los datos`);
        }
      }
      return { prompt: String(r.prompt), condition, options: r.options, impostorId: r.impostorId };
    });
    return { version: 1, rounds };
  },
  toPublic: (payload, index) => ({
    rounds: payload.rounds.map((r) => ({ prompt: r.prompt, options: r.options.map((id) => index.summary(id)!) })),
  }),
};
