import { EUROPE } from "@/lib/countries";
import { POSITIONS, type Position } from "@/types/football";
import type { FootballIndex } from "../dataset/football-index";
import { CONDITION_TYPES, ConditionError, type Condition, type ConditionInput, type ConditionType } from "./types";

const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

function need<T>(value: T | undefined, what: string, ref: unknown): T {
  if (value === undefined) throw new ConditionError(`${what} desconocido: ${JSON.stringify(ref)}`);
  return value;
}

/**
 * Convierte cualquier condición de entrada a su forma canónica con ids resueltos.
 * Lanza ConditionError si referencia algo que no existe en el dataset: así una consigna mal cargada
 * en /admin se detecta al guardarla y no cuando un usuario la juega.
 */
export function normalizeCondition(input: ConditionInput, index: FootballIndex): Condition {
  if (!input || typeof input !== "object") throw new ConditionError("Condición inválida");
  const raw = input as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label : undefined;
  const withLabel = <T extends object>(c: T) => (label ? { ...c, label } : c);

  if ("AND" in raw) return withLabel({ AND: asArray(raw.AND as ConditionInput[]).map((c) => normalizeCondition(c, index)) });
  if ("OR" in raw) return withLabel({ OR: asArray(raw.OR as ConditionInput[]).map((c) => normalizeCondition(c, index)) });
  if ("NOT" in raw) return withLabel({ NOT: normalizeCondition(raw.NOT as ConditionInput, index) });

  // Forma canónica { type, ...params } o abreviada { TYPE: valor }
  let type: ConditionType;
  let params: Record<string, unknown>;
  if (typeof raw.type === "string") {
    type = raw.type as ConditionType;
    params = raw;
  } else {
    const key = Object.keys(raw).find((k) => (CONDITION_TYPES as readonly string[]).includes(k));
    if (!key) throw new ConditionError(`Tipo de condición desconocido: ${JSON.stringify(raw)}`);
    type = key as ConditionType;
    const value = raw[key];
    params = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { value };
  }
  if (!(CONDITION_TYPES as readonly string[]).includes(type)) throw new ConditionError(`Tipo de condición desconocido: ${type}`);

  const str = (...keys: string[]) => {
    for (const k of [...keys, "value"]) if (typeof params[k] === "string") return params[k] as string;
    for (const k of [...keys, "value"]) if (typeof params[k] === "number") return String(params[k]);
    return undefined;
  };
  const num = (...keys: string[]) => {
    for (const k of [...keys, "value"]) if (params[k] !== undefined && !Number.isNaN(Number(params[k]))) return Number(params[k]);
    return undefined;
  };
  const club = (key = "club") => {
    const ref = str(key);
    return need(ref ? index.resolveClubId(ref) : undefined, "Club", ref);
  };
  const optionalClub = () => {
    const ref = typeof params.club === "string" ? params.club : undefined;
    return ref ? need(index.resolveClubId(ref), "Club", ref) : undefined;
  };

  switch (type) {
    case "PLAYED_FOR_CLUB":
    case "ACADEMY_OF":
      return withLabel({ type, club: club() });
    case "PLAYED_FOR_COUNTRY": {
      const ref = str("nationalTeam", "team");
      return withLabel({ type, nationalTeam: need(ref ? index.resolveNationalTeamId(ref) : undefined, "Selección", ref) });
    }
    case "NATIONALITY": {
      const country = str("country");
      if (!country) throw new ConditionError("NATIONALITY requiere un país");
      return withLabel({ type, country: country.toUpperCase() });
    }
    case "POSITION": {
      const positions = asArray((params.positions ?? params.value) as string | string[]).map((p) => String(p).toUpperCase());
      for (const p of positions) if (!(POSITIONS as readonly string[]).includes(p)) throw new ConditionError(`Posición desconocida: ${p}`);
      return withLabel({ type, positions: positions as Position[] });
    }
    case "WON_COMPETITION": {
      const ref = str("competition");
      const competition = need(ref ? index.resolveCompetitionId(ref) : undefined, "Competición", ref);
      const ntRef = typeof params.nationalTeam === "string" ? params.nationalTeam : undefined;
      const nationalTeam = ntRef ? need(index.resolveNationalTeamId(ntRef), "Selección", ntRef) : undefined;
      const season = typeof params.season === "number" ? params.season : undefined;
      const result = typeof params.result === "string" ? (params.result as "WINNER") : undefined;
      return withLabel({ type, competition, club: optionalClub(), nationalTeam, season, result });
    }
    case "PLAYED_COMPETITION": {
      const ref = str("competition");
      return withLabel({ type, competition: need(ref ? index.resolveCompetitionId(ref) : undefined, "Competición", ref) });
    }
    case "PLAYED_IN_COUNTRY": {
      const values = asArray((params.countries ?? params.country ?? params.value) as string | string[]).map((c) => String(c).toUpperCase());
      const countries = values.flatMap((c) => (c === "EUROPE" || c === "EUROPA" ? EUROPE : [c]));
      return withLabel({ type, countries: [...new Set(countries)] });
    }
    case "COACHED_BY": {
      const ref = str("coach");
      return withLabel({ type, coach: need(ref ? index.resolveCoachId(ref) : undefined, "Entrenador", ref) });
    }
    case "TEAMMATE_WITH": {
      const ref = str("player");
      return withLabel({ type, player: need(ref ? index.resolvePlayerId(ref) : undefined, "Jugador", ref) });
    }
    case "PLAYED_MATCH":
    case "SCORED_IN_MATCH": {
      const ref = str("match");
      return withLabel({ type, match: need(ref && index.match(ref) ? ref : undefined, "Partido", ref) });
    }
    case "ACTIVE_PLAYER":
    case "RETIRED_PLAYER":
      return withLabel({ type });
    case "DECADE": {
      const decade = num("decade");
      if (decade === undefined) throw new ConditionError("DECADE requiere un año");
      return withLabel({ type, decade: Math.floor(decade / 10) * 10 });
    }
    case "MIN_GOALS":
    case "MIN_APPEARANCES": {
      const min = num("min");
      if (min === undefined) throw new ConditionError(`${type} requiere un mínimo`);
      return withLabel({ type, min, club: optionalClub() });
    }
  }
}
