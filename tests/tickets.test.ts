import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeResult } from "@/lib/game-engine/scoring";
import { decodeTicket, encodeTicket, newTicket, TicketError, type GridTicket } from "@/lib/game-engine/tickets";

const KEY = "grid:daily:2026-10-26";

describe("tickets firmados", () => {
  it("se decodifican sólo para el juego y desafío correctos", () => {
    const token = newTicket("grid", KEY, null);
    const ticket = decodeTicket(token, "grid", KEY);
    assert.equal(ticket.attempts, 0);
    assert.throws(() => decodeTicket(token, "grid", "grid:daily:2026-10-27"), TicketError);
    assert.throws(() => decodeTicket(token, "impostor", KEY), TicketError);
  });

  it("detectan cualquier modificación del cliente", () => {
    const token = newTicket("grid", KEY, null);
    const [data, mac] = token.split(".");
    const forged = JSON.parse(Buffer.from(data, "base64url").toString()) as GridTicket;
    forged.attempts = -50; // intentar regalarse intentos
    const tampered = `${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${mac}`;
    assert.throws(() => decodeTicket(tampered, "grid", KEY), /modificada/);
    assert.throws(() => decodeTicket("basura", "grid", KEY), TicketError);
  });

  it("el puntaje sale del ticket, no del cliente", () => {
    const ticket = decodeTicket(newTicket("grid", KEY, "user-1"), "grid", KEY);
    const played: GridTicket = { ...ticket, attempts: 10, done: true, cells: [{ p: "a", r: 10 }, { p: "b", r: 30 }, null, null, null, null, null, null, null] };
    const result = computeResult(decodeTicket(encodeTicket(played), "grid", KEY));
    assert.deepEqual(result, { score: 2, max: 9, win: false, rarity: 10 + 30 + 7 * 100 });
  });

  it("impostor y El 11 cuentan aciertos y casilleros", () => {
    const imp = decodeTicket(newTicket("impostor", "impostor:x", null), "impostor", "impostor:x");
    assert.equal(computeResult({ ...imp, answers: [true, true, false, true, true] }, { rounds: 5 }).score, 4);
    const eleven = decodeTicket(newTicket("el-11", "el-11:x", null), "el-11", "el-11:x");
    assert.equal(eleven.lives, 3);
    assert.equal(computeResult({ ...eleven, slots: ["a", "b", null, null, null, null, null, null, null, null, null] }).score, 2);
  });
});
