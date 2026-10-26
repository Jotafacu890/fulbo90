import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStaticDataset } from "@/data";
import { evaluate } from "@/lib/game-engine/conditions";
import { DAILY_ADAPTERS } from "@/lib/game-engine/daily/adapters";
import { conditionKey, isSoftKey } from "@/lib/game-engine/daily/keys";
import { maxDistinctAssignment } from "@/lib/game-engine/daily/matching";
import { ensureCalendar, ensureDay, findCandidate, regenerateDay, DEFAULT_SETTINGS } from "@/lib/game-engine/daily/scheduler";
import { validateCandidate } from "@/lib/game-engine/daily/validate";
import { addDays } from "@/lib/game-engine/daily";
import { FootballIndex } from "@/lib/game-engine/dataset/football-index";
import { getEngine } from "@/lib/game-engine/games";
import type { GridPayload } from "@/lib/game-engine/games/grid";
import type { ImpostorPayload } from "@/lib/game-engine/games/impostor";
import type { ElevenPayload } from "@/lib/game-engine/games/starting-eleven";
import type { WhoIsPayload } from "@/lib/game-engine/games/who-is";
import { createRng } from "@/lib/game-engine/rng";
import type { GameSlug } from "@/lib/games/registry";
import { MemoryCalendarRepository } from "./helpers/memory-repository";

const index = new FootballIndex(buildStaticDataset());
const GAMES = Object.keys(DAILY_ADAPTERS) as GameSlug[];
const open = { recentKeys: new Set<string>(), blockedKeys: new Set<string>(), minDifficulty: 1, maxDifficulty: 3 };
const generate = (game: GameSlug, seed: string) => getEngine(game)!.generate(index, createRng(seed), { kind: "daily" });

describe("generadores + validadores de cada juego", () => {
  for (const game of GAMES) {
    it(`${game}: los candidatos válidos tienen respuestas correctas verificadas contra los datos`, () => {
      let valid = 0;
      for (let i = 0; i < 25; i++) {
        const payload = generate(game, `${game}:t:${i}`);
        const r = validateCandidate(game, payload, index, open);
        if (!r.ok) continue;
        valid++;
        assert.ok(r.difficulty! >= 1 && r.difficulty! <= 3);
        assert.ok(r.repeatKeys.length > 0);
        for (const a of r.verification!.answers) assert.ok(a.playerIds.length > 0, `${a.key} sin respuestas`);
      }
      assert.ok(valid >= 20, `sólo ${valid}/25 válidos`);
    });
  }

  it("grid: cada respuesta verificada cumple fila y columna, y hay solución con 9 jugadores distintos", () => {
    const payload = generate("grid", "grid:cross") as GridPayload;
    const v = DAILY_ADAPTERS.grid!.verify(payload, index);
    for (const a of v.answers) {
      const [r, c] = a.key.split("-").map(Number);
      for (const p of a.playerIds) assert.ok(evaluate(payload.rows[r], p, index) && evaluate(payload.cols[c], p, index));
    }
    assert.equal(maxDistinctAssignment(v.answers.map((a) => a.playerIds)), 9);
  });

  it("grid: rechaza condiciones repetidas", () => {
    const payload = generate("grid", "grid:dup") as GridPayload;
    const dup: GridPayload = { ...payload, rows: [payload.cols[0], payload.rows[1], payload.rows[2]] };
    const r = validateCandidate("grid", dup, index, open);
    assert.ok(!r.ok);
  });

  it("¿Quién es?: detecta pistas ambiguas (otro jugador encaja con todas)", () => {
    const payload = generate("quien-es", "qe:amb") as WhoIsPayload;
    const vague: WhoIsPayload = { ...payload, clues: payload.clues.map((c) => ({ ...c, clubId: undefined })) };
    // Sin clubes en las pistas, cualquier compatriota de la misma posición y estado encaja.
    const problems = DAILY_ADAPTERS["quien-es"]!.ambiguity(vague, index, DAILY_ADAPTERS["quien-es"]!.verify(vague, index));
    const target = index.player(payload.playerId)!;
    const twins = index.players.filter((p) => p.id !== target.id && p.nationality === target.nationality && p.primaryPosition === target.primaryPosition && p.active === target.active);
    assert.equal(problems.length > 0, twins.length > 0);
  });

  it("impostor: exactamente 4 cumplen y 1 no en cada ronda", () => {
    const payload = generate("impostor", "imp:v") as ImpostorPayload;
    DAILY_ADAPTERS.impostor!.verify(payload, index);
    const broken: ImpostorPayload = { ...payload, rounds: payload.rounds.map((r, i) => (i === 0 ? { ...r, impostorId: r.options.find((o) => o !== r.impostorId)! } : r)) };
    assert.throws(() => DAILY_ADAPTERS.impostor!.verify(broken, index));
  });

  it("El 11: alcanza para un once de jugadores distintos", () => {
    const payload = generate("el-11", "e11:v") as ElevenPayload;
    const v = DAILY_ADAPTERS["el-11"]!.verify(payload, index);
    assert.ok(maxDistinctAssignment(v.answers.map((a) => a.playerIds)) >= 11);
  });

  it("rechaza contenido reciente, bloqueado y fuera del rango de dificultad", () => {
    const payload = generate("quien-es", "qe:rules") as WhoIsPayload;
    const key = `player:${payload.playerId}`;
    assert.ok(!validateCandidate("quien-es", payload, index, { ...open, recentKeys: new Set([key]) }).ok);
    assert.ok(!validateCandidate("quien-es", payload, index, { ...open, blockedKeys: new Set([key]) }).ok);
    const d = validateCandidate("quien-es", payload, index, open).difficulty!;
    const other = d === 3 ? 1 : 3;
    assert.ok(!validateCandidate("quien-es", payload, index, { ...open, minDifficulty: other, maxDifficulty: other }).ok);
  });

  it("las claves de condición son estables (no dependen del orden de las propiedades)", () => {
    assert.equal(conditionKey({ type: "WON_COMPETITION", competition: "libertadores", club: "boca" }), conditionKey({ club: "boca", competition: "libertadores", type: "WON_COMPETITION" } as never));
  });

  it("findCandidate respeta la dificultad pedida cuando existe", () => {
    for (const target of [1, 2, 3] as const) {
      const { candidate } = findCandidate("grid", "2027-01-01", index, open, { target });
      assert.equal(candidate?.difficulty, target);
    }
  });
});

describe("calendario automático", () => {
  const today = "2026-10-26";

  it("precarga 30 días para todos los juegos, sin repetir contenido dentro de la ventana", async () => {
    const repo = new MemoryCalendarRepository();
    const { days } = await ensureCalendar(repo, index, { today });
    assert.equal(days.length, GAMES.length * 30);
    assert.ok(days.every((d) => d.status === "created"), JSON.stringify(days.filter((d) => d.status !== "created")));
    for (const game of GAMES) {
      const keys = repo.usage.filter((u) => u.game === game);
      // Repeticiones exactas: nunca dentro de los 30 días. Parciales: nunca a menos de 7 días.
      const seen = new Map<string, string>();
      for (const u of [...keys].sort((a, b) => a.date.localeCompare(b.date))) {
        const prev = seen.get(u.key);
        if (prev) {
          const gap = (Date.parse(u.date) - Date.parse(prev)) / 86_400_000;
          assert.ok(isSoftKey(u.key) && gap > DEFAULT_SETTINGS.softRepeatDays, `${game}: ${u.key} repetida (${prev} y ${u.date})`);
        }
        seen.set(u.key, u.date);
      }
    }
    assert.ok(repo.logs.some((l) => l.event === "cron-run"));
    // Las reservas también quedan precargadas.
    for (const game of GAMES) assert.equal((await repo.listReserves(game)).length, DEFAULT_SETTINGS.reserveSize);
  });

  it("es idempotente: una segunda corrida no crea nada", async () => {
    const repo = new MemoryCalendarRepository();
    await ensureCalendar(repo, index, { today, games: ["grid"] });
    const before = repo.dailies.size;
    const { days } = await ensureCalendar(repo, index, { today, games: ["grid"] });
    assert.ok(days.every((d) => d.status === "exists"));
    assert.equal(repo.dailies.size, before);
  });

  it("dos ejecuciones simultáneas del cron no duplican el desafío del día", async () => {
    const repo = new MemoryCalendarRepository();
    const [a, b] = await Promise.all([ensureDay(repo, index, "impostor", today), ensureDay(repo, index, "impostor", today)]);
    assert.deepEqual([a.status, b.status].sort(), ["created", "exists"]);
    assert.equal(repo.dailies.size, 1);
  });

  it("todos reciben el mismo desafío: la fecha determina el seed", async () => {
    const r1 = new MemoryCalendarRepository();
    const r2 = new MemoryCalendarRepository();
    await ensureDay(r1, index, "grid", today);
    await ensureDay(r2, index, "grid", today);
    assert.deepEqual([...r1.dailies.values()][0].candidate.payload, [...r2.dailies.values()][0].candidate.payload);
  });

  it("si falla la generación usa una reserva validada y registra el incidente", async () => {
    const repo = new MemoryCalendarRepository();
    const settings = { ...DEFAULT_SETTINGS, reserveSize: 2 };
    const { ensureReserves } = await import("@/lib/game-engine/daily/scheduler");
    await ensureReserves(repo, index, "quien-es", settings, today);
    const failing: typeof findCandidate = () => ({ candidate: null, attempts: 40, errors: ["generador caído"] });
    const report = await ensureDay(repo, index, "quien-es", today, { settings, find: failing });
    assert.equal(report.status, "fallback");
    assert.equal([...repo.dailies.values()][0].source, "RESERVE");
    assert.ok(repo.logs.some((l) => l.event === "fallback" && l.level === "WARN"));
    assert.equal((await repo.listReserves("quien-es")).length, 1);
  });

  it("sin reservas ni candidatos registra un error", async () => {
    const repo = new MemoryCalendarRepository();
    const failing: typeof findCandidate = () => ({ candidate: null, attempts: 40, errors: ["sin datos"] });
    const report = await ensureDay(repo, index, "grid", today, { find: failing });
    assert.equal(report.status, "failed");
    assert.ok(repo.logs.some((l) => l.level === "ERROR"));
  });

  it("no regenera un desafío publicado sin override; uno futuro sí, y cambia", async () => {
    const repo = new MemoryCalendarRepository();
    await ensureDay(repo, index, "quien-es", today);
    await assert.rejects(regenerateDay(repo, index, "quien-es", today, { today }), /publicado/);

    const future = addDays(today, 5);
    await ensureDay(repo, index, "quien-es", future);
    const before = JSON.stringify([...repo.dailies.values()].find((d) => d.date === future)!.candidate.payload);
    await regenerateDay(repo, index, "quien-es", future, { today });
    const after = JSON.stringify([...repo.dailies.values()].find((d) => d.date === future)!.candidate.payload);
    assert.notEqual(before, after);

    const report = await regenerateDay(repo, index, "quien-es", today, { today, override: { reason: "dato incorrecto", by: "admin@test" } });
    assert.equal(report.status, "created");
    assert.ok(repo.logs.some((l) => l.event === "admin-override"));
  });

  it("el contenido bloqueado no se publica", async () => {
    const repo = new MemoryCalendarRepository();
    await ensureDay(repo, index, "quien-es", today);
    const first = [...repo.dailies.values()][0].candidate.payload as WhoIsPayload;
    const repo2 = new MemoryCalendarRepository();
    repo2.blocked.add(`player:${first.playerId}`);
    await ensureDay(repo2, index, "quien-es", today);
    assert.notEqual(([...repo2.dailies.values()][0].candidate.payload as WhoIsPayload).playerId, first.playerId);
  });
});
