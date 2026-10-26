import { cond, conditionKey, describeCondition, evaluate, findMatchingPlayers, isLeaf, normalizeCondition, type Condition } from "../conditions";
import type { FootballIndex } from "../dataset/football-index";
import type { Rng } from "../rng";
import { ChallengeGenerationError, type GameEngine } from "./types";

export const ELEVEN_VARIANTS = {
  argentinos: { name: "Clubes argentinos", description: "Un club argentino por vez." },
  sudamericanos: { name: "Clubes sudamericanos", description: "Brasil, Uruguay, Chile, Colombia y más." },
  libertadores: { name: "Libertadores", description: "Campeones de América con cada club." },
  seleccion: { name: "Selección Argentina", description: "Jugadores de la Selección y su paso por clubes." },
  leyendas: { name: "Leyendas", description: "Sólo jugadores retirados." },
  actuales: { name: "Jugadores actuales", description: "Sólo jugadores en actividad." },
} as const;

export type ElevenVariant = keyof typeof ELEVEN_VARIANTS;
export const ELEVEN_VARIANT_IDS = Object.keys(ELEVEN_VARIANTS) as ElevenVariant[];

export function isElevenVariant(value: string | undefined): value is ElevenVariant {
  return value !== undefined && value in ELEVEN_VARIANTS;
}

/** 11 consignas + 3 de reserva para "Pasar". */
export const ELEVEN_PROMPTS = 14;
export const ELEVEN_SKIPS = 3;
export const ELEVEN_LIVES = 3;
const MIN_ANSWERS = 3;

export interface ElevenPrompt {
  condition: Condition;
}

export interface ElevenPayload {
  version: 1;
  variant: ElevenVariant;
  prompts: ElevenPrompt[];
}

export interface ElevenPromptView {
  label: string;
  clubId?: string;
  shortName?: string;
  colors?: [string, string];
  /** Texto chico debajo del club (p. ej. "Ganó la Libertadores con"). */
  qualifier?: string;
}

export interface ElevenPublic {
  variant: ElevenVariant;
  variantName: string;
  prompts: ElevenPromptView[];
}

const SOUTH_AMERICA = ["BR", "UY", "CL", "CO", "PY", "EC", "PE", "BO", "VE"];

function promptPool(variant: ElevenVariant, index: FootballIndex): Condition[] {
  const clubConditions = (filter: (country: string) => boolean, wrap: (club: Condition) => Condition = (c) => c) =>
    index.clubs.filter((c) => filter(c.country)).map((c) => wrap(cond.club(c.id)));

  switch (variant) {
    case "argentinos":
      return clubConditions((c) => c === "AR");
    case "sudamericanos":
      return [...clubConditions((c) => SOUTH_AMERICA.includes(c)), ...clubConditions((c) => c === "AR").slice(0, 6)];
    case "libertadores":
      return [
        ...index.clubs.map((c) => cond.won("libertadores", { club: c.id })),
        cond.and(cond.won("libertadores"), cond.won("copa-america")),
        cond.and(cond.won("libertadores"), cond.playedIn(["ES", "IT", "EN", "FR", "DE", "PT"], "Jugó en Europa")),
      ];
    case "seleccion":
      return [
        ...clubConditions((c) => c === "AR" || c === "ES" || c === "IT" || c === "EN", (club) => cond.and(cond.country("ARG"), club)),
        cond.won("world-cup", { nationalTeam: "ARG" }),
        cond.won("copa-america", { nationalTeam: "ARG" }),
        cond.won("olympics", { nationalTeam: "ARG" }),
        cond.won("u20-world-cup", { nationalTeam: "ARG" }),
      ];
    case "leyendas":
      return clubConditions(() => true, (club) => cond.and(cond.retired(), club));
    case "actuales":
      return clubConditions(() => true, (club) => cond.and(cond.active(), club));
  }
}

export function generateEleven(index: FootballIndex, rng: Rng, variant: ElevenVariant): ElevenPayload {
  const pool = promptPool(variant, index).filter((c) => findMatchingPlayers(c, index).length >= MIN_ANSWERS);
  if (pool.length < ELEVEN_PROMPTS) {
    // Completa con clubes argentinos si la variante no alcanza (sin repetir consignas).
    const keys = new Set(pool.map(conditionKey));
    for (const extra of promptPool("argentinos", index)) {
      if (pool.length >= ELEVEN_PROMPTS) break;
      if (!keys.has(conditionKey(extra)) && findMatchingPlayers(extra, index).length >= MIN_ANSWERS) pool.push(extra);
    }
  }
  if (pool.length < ELEVEN_PROMPTS) throw new ChallengeGenerationError("No hay suficientes consignas para El 11");
  // Los clubes con más jugadores salen un poco más (son más reconocibles).
  const prompts: ElevenPrompt[] = [];
  let remaining = [...pool];
  while (prompts.length < ELEVEN_PROMPTS) {
    const pick = rng.weighted(remaining, (c) => Math.sqrt(findMatchingPlayers(c, index).length));
    remaining = remaining.filter((c) => c !== pick);
    prompts.push({ condition: pick });
  }
  return { version: 1, variant, prompts };
}

/** Busca el club "principal" de una consigna para mostrar su escudo. */
function findClub(c: Condition): string | undefined {
  if (isLeaf(c)) {
    if (c.type === "PLAYED_FOR_CLUB") return c.club;
    if (c.type === "WON_COMPETITION") return c.club;
    return undefined;
  }
  if ("AND" in c) return c.AND.map(findClub).find(Boolean);
  return undefined;
}

function promptView(c: Condition, index: FootballIndex): ElevenPromptView {
  const clubId = findClub(c);
  const club = clubId ? index.club(clubId) : undefined;
  if (!club) return { label: describeCondition(c, index) };
  let qualifier: string | undefined;
  if (isLeaf(c) && c.type === "WON_COMPETITION") qualifier = "Ganó la Libertadores con";
  else if ("AND" in c) {
    const others = c.AND.filter((x) => !(isLeaf(x) && x.type === "PLAYED_FOR_CLUB"));
    qualifier = others.map((x) => describeCondition(x, index)).join(" · ") + " · Jugó en";
  }
  return {
    label: club.name,
    clubId: club.id,
    shortName: club.shortName,
    colors: [club.primaryColor ?? "#1FA463", club.secondaryColor ?? "#F5F7F5"],
    qualifier,
  };
}

export function gradeElevenPick(payload: ElevenPayload, promptIndex: number, playerId: string, index: FootballIndex): boolean {
  const prompt = payload.prompts[promptIndex];
  return !!prompt && evaluate(prompt.condition, playerId, index);
}

export const elevenEngine: GameEngine<ElevenPayload, ElevenPublic> = {
  slug: "el-11",
  generate(index, rng, context) {
    const variant: ElevenVariant = isElevenVariant(context.variant)
      ? context.variant
      : // El desafío diario rota la variante según el día.
        ELEVEN_VARIANT_IDS[rng.int(ELEVEN_VARIANT_IDS.length)];
    return generateEleven(index, rng, variant);
  },
  validate(payload, index) {
    const p = payload as Partial<ElevenPayload>;
    if (!isElevenVariant(p?.variant)) throw new ChallengeGenerationError("Variante inválida");
    if (!Array.isArray(p.prompts) || p.prompts.length < 11) throw new ChallengeGenerationError("El 11 necesita al menos 11 consignas");
    const prompts = p.prompts.map((pr, i) => {
      const condition = normalizeCondition(pr.condition, index);
      if (findMatchingPlayers(condition, index).length === 0) throw new ChallengeGenerationError(`Consigna ${i + 1} sin respuestas posibles`);
      return { condition };
    });
    return { version: 1, variant: p.variant, prompts };
  },
  toPublic: (payload, index) => ({
    variant: payload.variant,
    variantName: ELEVEN_VARIANTS[payload.variant].name,
    prompts: payload.prompts.map((p) => promptView(p.condition, index)),
  }),
};
