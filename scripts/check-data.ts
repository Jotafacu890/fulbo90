/**
 * Verifica la integridad del seed: referencias, años y coherencia entre títulos de jugadores y de clubes.
 * Uso: npm run data:check
 */
import { buildStaticDataset } from "@/data";

const ds = buildStaticDataset();
const errors: string[] = [];
const warnings: string[] = [];

const ids = (list: { id: string }[], what: string) => {
  const set = new Set<string>();
  for (const x of list) {
    if (set.has(x.id)) errors.push(`${what} duplicado: ${x.id}`);
    set.add(x.id);
  }
  return set;
};

const players = ids(ds.players, "Jugador");
const clubs = ids(ds.clubs, "Club");
const comps = ids(ds.competitions, "Competición");
const nts = ids(ds.nationalTeams, "Selección");
const matches = ids(ds.matches, "Partido");
const coaches = ids(ds.coaches, "DT");

for (const s of ds.playerClubs) {
  if (!clubs.has(s.clubId)) errors.push(`${s.playerId}: club inexistente ${s.clubId}`);
  if (s.fromYear && s.toYear && s.toYear < s.fromYear) errors.push(`${s.playerId}: años invertidos en ${s.clubId}`);
}
for (const n of ds.playerNationalTeams) if (!nts.has(n.nationalTeamId)) errors.push(`${n.playerId}: selección inexistente ${n.nationalTeamId}`);

// Ganadores de selecciones que el seed conoce (para detectar errores de tipeo).
const NT_WINNERS: Record<string, Record<string, number[]>> = {
  "world-cup": { ARG: [1978, 1986, 2022], URU: [1930, 1950], BRA: [1958, 1962, 1970, 1994, 2002] },
  "copa-america": { ARG: [1947, 1957, 1991, 1993, 2021, 2024], URU: [1983, 1987, 1995, 2011], BRA: [1997, 1999, 2004, 2007, 2019], CHI: [2015, 2016], COL: [2001], PER: [1975] },
  olympics: { ARG: [2004, 2008], BRA: [2016] },
  "u20-world-cup": { ARG: [1979, 1995, 1997, 2001, 2005, 2007] },
};

const clubTitles = new Set(ds.clubAchievements.map((a) => `${a.competitionId}:${a.season}:${a.clubId}`));
const CLUB_COMPS_WITH_TABLE = new Set(ds.clubAchievements.map((a) => a.competitionId));

for (const a of ds.playerAchievements) {
  if (!comps.has(a.competitionId)) errors.push(`${a.playerId}: competición inexistente ${a.competitionId}`);
  if (a.clubId) {
    if (!clubs.has(a.clubId)) errors.push(`${a.playerId}: club inexistente en título ${a.clubId}`);
    const stints = ds.playerClubs.filter((s) => s.playerId === a.playerId && s.clubId === a.clubId && !s.isYouth);
    if (!stints.length) errors.push(`${a.playerId}: título con ${a.clubId} sin paso por el club`);
    const inRange = stints.some((s) => !s.fromYear || (s.fromYear <= a.season && (s.toYear == null || s.toYear >= a.season)));
    if (stints.length && !inRange) warnings.push(`${a.playerId}: título ${a.competitionId} ${a.season} fuera de sus años en ${a.clubId}`);
    if (a.result === "WINNER" && CLUB_COMPS_WITH_TABLE.has(a.competitionId) && !clubTitles.has(`${a.competitionId}:${a.season}:${a.clubId}`)) {
      errors.push(`${a.playerId}: ${a.clubId} no figura como campeón de ${a.competitionId} ${a.season}`);
    }
  }
  if (a.nationalTeamId) {
    if (!nts.has(a.nationalTeamId)) errors.push(`${a.playerId}: selección inexistente ${a.nationalTeamId}`);
    const winners = NT_WINNERS[a.competitionId]?.[a.nationalTeamId];
    if (a.result === "WINNER" && winners && !winners.includes(a.season)) errors.push(`${a.playerId}: ${a.nationalTeamId} no ganó ${a.competitionId} ${a.season}`);
  }
}

for (const a of ds.clubAchievements) {
  if (!clubs.has(a.clubId)) errors.push(`Palmarés: club inexistente ${a.clubId}`);
  if (!comps.has(a.competitionId)) errors.push(`Palmarés: competición inexistente ${a.competitionId}`);
}
for (const l of ds.lineups) {
  if (!players.has(l.playerId)) errors.push(`Alineación ${l.matchId}: jugador inexistente ${l.playerId}`);
  if (!matches.has(l.matchId)) errors.push(`Alineación: partido inexistente ${l.matchId}`);
}
for (const s of ds.coachStints) {
  if (!coaches.has(s.coachId)) errors.push(`DT inexistente ${s.coachId}`);
  if (s.clubId && !clubs.has(s.clubId)) errors.push(`DT ${s.coachId}: club inexistente ${s.clubId}`);
  if (s.nationalTeamId && !nts.has(s.nationalTeamId)) errors.push(`DT ${s.coachId}: selección inexistente ${s.nationalTeamId}`);
}
for (const c of ds.coaches) if (c.playerId && !players.has(c.playerId)) errors.push(`DT ${c.id}: jugador inexistente ${c.playerId}`);
for (const p of ds.players) if (!ds.playerClubs.some((s) => s.playerId === p.id)) warnings.push(`${p.id}: sin clubes`);

const usedClubs = new Set(ds.playerClubs.map((s) => s.clubId));
for (const c of ds.clubs) if (!usedClubs.has(c.id)) warnings.push(`Club sin jugadores: ${c.id}`);

console.log(`Jugadores: ${ds.players.length} · Clubes: ${ds.clubs.length} · Competiciones: ${ds.competitions.length} · Pasos por clubes: ${ds.playerClubs.length} · Títulos: ${ds.playerAchievements.length}`);
for (const w of warnings) console.warn(`⚠ ${w}`);
for (const e of errors) console.error(`✖ ${e}`);
if (errors.length) {
  console.error(`\n${errors.length} errores`);
  process.exit(1);
}
console.log(`✔ Datos consistentes (${warnings.length} advertencias)`);
