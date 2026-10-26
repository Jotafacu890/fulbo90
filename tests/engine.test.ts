import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStaticDataset } from "@/data";
import { argentinaDate, challengeNumber, msUntilNextDaily } from "@/lib/game-engine/daily";
import { cond, describeCondition, evaluate, explainCondition, findMatchingPlayers, normalizeCondition } from "@/lib/game-engine/conditions";
import { FootballIndex } from "@/lib/game-engine/dataset/football-index";
import { generateGrid, gradeGridCell, gridCellAnswers } from "@/lib/game-engine/games/grid";
import { generateImpostor, IMPOSTOR_ROUNDS } from "@/lib/game-engine/games/impostor";
import { ELEVEN_VARIANT_IDS, generateEleven } from "@/lib/game-engine/games/starting-eleven";
import { generateWhoIs, MIN_CLUES } from "@/lib/game-engine/games/who-is";
import { canPlaySlot } from "@/lib/game-engine/positions";
import { createRng } from "@/lib/game-engine/rng";
import { searchPlayers } from "@/lib/search/player-search";

const index = new FootballIndex(buildStaticDataset());

describe("motor de condiciones", () => {
  it("River + Selección Argentina incluye a Julián Álvarez", () => {
    const c = cond.and(cond.club("river"), cond.country("ARG"));
    assert.ok(evaluate(c, "julian-alvarez", index));
  });

  it("Boca + ganó Libertadores incluye a Riquelme y excluye a Aimar", () => {
    const c = cond.won("libertadores", { club: "boca" });
    assert.ok(evaluate(c, "juan-roman-riquelme", index));
    assert.ok(!evaluate(c, "pablo-aimar", index));
    assert.match(explainCondition(c, "pablo-aimar", index), /nunca jugó en Boca/);
  });

  it("acepta la forma abreviada y referencias por nombre", () => {
    const c = normalizeCondition({ AND: [{ PLAYED_FOR_CLUB: "River Plate" }, { WON_COMPETITION: "Copa Libertadores" }] }, index);
    assert.ok(evaluate(c, "enzo-perez", index));
    assert.ok(!evaluate(c, "carlos-tevez", index));
    assert.equal(describeCondition(c, index), "Jugó en River y Ganó la Libertadores");
  });

  it("una pregunta admite múltiples respuestas correctas", () => {
    const c = cond.and(cond.club("river"), cond.club("man-city"));
    const answers = findMatchingPlayers(c, index);
    assert.ok(answers.includes("julian-alvarez"));
    assert.ok(answers.includes("claudio-echeverri"));
  });

  it("NOT y OR", () => {
    const c = cond.and(cond.club("boca"), cond.not(cond.club("river")));
    assert.ok(evaluate(c, "juan-roman-riquelme", index));
    assert.ok(!evaluate(c, "gabriel-batistuta", index));
    assert.ok(evaluate(cond.or(cond.club("racing"), cond.club("independiente")), "diego-milito", index));
  });

  it("las inferiores no cuentan como 'jugó en'", () => {
    assert.ok(!evaluate(cond.club("newells"), "lionel-messi", index));
    assert.ok(evaluate(cond.academy("newells"), "lionel-messi", index));
  });

  it("COACHED_BY y TEAMMATE_WITH usan años superpuestos", () => {
    assert.ok(evaluate(cond.coachedBy("gallardo-dt"), "lucas-pratto", index));
    assert.ok(!evaluate(cond.coachedBy("gallardo-dt"), "hernan-crespo", index));
    assert.ok(evaluate({ type: "TEAMMATE_WITH", player: "lionel-messi" }, "javier-mascherano", index));
    assert.ok(!evaluate({ type: "TEAMMATE_WITH", player: "lionel-messi" }, "lionel-messi", index));
  });

  it("partidos registrados", () => {
    assert.ok(evaluate({ type: "SCORED_IN_MATCH", match: "mundial-1986-final" }, "jose-luis-brown", index));
    assert.ok(!evaluate({ type: "SCORED_IN_MATCH", match: "mundial-1986-final" }, "diego-maradona", index));
  });
});

describe("posiciones", () => {
  it("cada futbolista sólo ocupa posiciones compatibles", () => {
    assert.ok(canPlaySlot(index.positions("franco-armani"), "ARQ"));
    assert.ok(!canPlaySlot(index.positions("franco-armani"), "DFC"));
    assert.ok(canPlaySlot(index.positions("enzo-perez"), "MCD"));
    assert.ok(canPlaySlot(index.positions("julian-alvarez"), "ED"));
    assert.ok(!canPlaySlot(index.positions("julian-alvarez"), "LD"));
  });
});

describe("generadores", () => {
  for (const seed of ["2026-10-23", "2026-10-24", "abc", "xyz123", "inf-9"]) {
    it(`grid válido y determinístico (${seed})`, () => {
      const a = generateGrid(index, createRng(seed));
      const b = generateGrid(index, createRng(seed));
      assert.deepEqual(a, b);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          const answers = gridCellAnswers(a, r, c, index);
          assert.ok(answers.length >= 2, `celda ${r}-${c} con ${answers.length} respuestas`);
          assert.ok(gradeGridCell(a, r, c, answers[0], index));
        }
    });

    it(`impostor con ${IMPOSTOR_ROUNDS} rondas coherentes (${seed})`, () => {
      const p = generateImpostor(index, createRng(seed));
      assert.equal(p.rounds.length, IMPOSTOR_ROUNDS);
      for (const r of p.rounds) {
        assert.equal(r.options.length, 5);
        assert.ok(!evaluate(r.condition, r.impostorId, index));
        assert.equal(r.options.filter((o) => evaluate(r.condition, o, index)).length, 4);
      }
    });

    it(`¿Quién es? con pistas suficientes (${seed})`, () => {
      const p = generateWhoIs(index, createRng(seed));
      assert.ok(p.clues.length >= MIN_CLUES);
    });
  }

  for (const variant of ELEVEN_VARIANT_IDS) {
    it(`El 11 — variante ${variant}`, () => {
      const p = generateEleven(index, createRng(variant), variant);
      assert.equal(p.prompts.length, 14);
      for (const pr of p.prompts) assert.ok(findMatchingPlayers(pr.condition, index).length >= 3);
    });
  }
});

describe("búsqueda", () => {
  it("ignora tildes y mayúsculas", () => {
    const names = searchPlayers(index.players, "julian").map((p) => p.id);
    assert.ok(names.includes("julian-alvarez"));
    assert.equal(searchPlayers(index.players, "RIQUELME")[0].id, "juan-roman-riquelme");
  });
  it("tolera errores de tipeo", () => {
    assert.equal(searchPlayers(index.players, "riquelmi")[0]?.id, "juan-roman-riquelme");
    assert.equal(searchPlayers(index.players, "batistutta")[0]?.id, "gabriel-batistuta");
  });
  it("encuentra por apodo", () => {
    assert.equal(searchPlayers(index.players, "dibu")[0]?.id, "emiliano-martinez");
  });
});

describe("calendario diario", () => {
  it("usa la fecha de Buenos Aires", () => {
    // 02:30 UTC del 24/10 = 23:30 del 23/10 en Argentina
    assert.equal(argentinaDate(new Date("2026-10-24T02:30:00Z")), "2026-10-23");
    assert.equal(argentinaDate(new Date("2026-10-24T03:00:00Z")), "2026-10-24");
    assert.equal(msUntilNextDaily(new Date("2026-10-24T02:30:00Z")), 30 * 60_000);
  });
  it("numera desde el lanzamiento", () => {
    assert.equal(challengeNumber("2026-06-01", "2026-06-01"), 1);
    assert.equal(challengeNumber("2026-10-23", "2026-06-01"), 145);
  });
});

describe("compartir", () => {
  it("usa la marca y no revela respuestas", async () => {
    const { gridShareText } = await import("@/lib/share");
    const text = gridShareText({
      gameName: "Grid",
      number: 124,
      cells: [
        ["ok", "ok", "ok"],
        ["ok", "late", "ok"],
        ["ok", "ok", "miss"],
      ],
      score: 8,
      rarity: 184,
      streak: 7,
    });
    assert.equal(text.split("\n").slice(0, 7).join("\n"), "⚽ FULBO90\nGRID #124\n🟩🟩🟩\n🟩🟨🟩\n🟩🟩🟥\n8/9 aciertos · Rareza 184\n🔥 Racha: 7 días");
    assert.match(text, /¿Cuánto sabés de fulbo\?/);
  });
});
