import { describeCondition, findMatchingPlayers } from "../../conditions";
import { gridCellAnswers, type GridPayload } from "../../games/grid";
import { conditionKey, entityKeys, fingerprint } from "../keys";
import { maxDistinctAssignment, median } from "../matching";
import { VerificationError, type DailyAdapter } from "../types";

const CELLS = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => [r, c] as const));

export const gridDaily: DailyAdapter<GridPayload> = {
  verify(p, index) {
    const answers = CELLS.map(([r, c]) => ({ key: `${r}-${c}`, playerIds: gridCellAnswers(p, r, c, index) }));
    const weak = answers.find((a) => a.playerIds.length < 2);
    if (weak) throw new VerificationError(`Celda ${weak.key} con menos de 2 respuestas`);
    if (maxDistinctAssignment(answers.map((a) => a.playerIds)) < 9) throw new VerificationError("No existe una solución con 9 jugadores diferentes");
    const conditions = [...p.rows.map((c, i) => ({ key: `row-${i}`, condition: c })), ...p.cols.map((c, i) => ({ key: `col-${i}`, condition: c }))];
    return { conditions: conditions.map((x) => ({ ...x, label: describeCondition(x.condition, index) })), answers };
  },

  ambiguity(p, index, verification) {
    const problems: string[] = [];
    const keys = [...p.rows, ...p.cols].map(conditionKey);
    if (new Set(keys).size !== keys.length) problems.push("Hay una condición repetida entre filas y columnas");
    // Cruce redundante: si TODOS los jugadores de la columna cumplen la fila, la fila no agrega nada.
    const rowSets = p.rows.map((r) => findMatchingPlayers(r, index));
    const colSets = p.cols.map((c) => findMatchingPlayers(c, index));
    for (const [r, c] of CELLS) {
      const cell = verification.answers.find((a) => a.key === `${r}-${c}`)!.playerIds.length;
      if (cell === colSets[c].length && colSets[c].length >= 3) problems.push(`"${describeCondition(p.rows[r], index)}" es redundante con "${describeCondition(p.cols[c], index)}"`);
      if (cell === rowSets[r].length && rowSets[r].length >= 3) problems.push(`"${describeCondition(p.cols[c], index)}" es redundante con "${describeCondition(p.rows[r], index)}"`);
    }
    return problems;
  },

  difficulty(_p, _index, verification) {
    const m = median(verification.answers.map((a) => a.playerIds.length));
    // Umbrales calibrados con los terciles de la mediana de respuestas por celda sobre el dataset actual.
    return m > 7 ? 1 : m >= 6 ? 2 : 3;
  },

  repeatKeys(p) {
    // No repetir exactamente el mismo cruce (fila × columna) ni la misma grilla.
    const pairs = CELLS.map(([r, c]) => `pair:${[conditionKey(p.rows[r]), conditionKey(p.cols[c])].sort().join("|")}`);
    return [...pairs, `fp:${fingerprint([...p.rows, ...p.cols].map(conditionKey))}`];
  },

  contentKeys(p) {
    return [...new Set([...p.rows, ...p.cols].flatMap((c) => [conditionKey(c), ...entityKeys(c)]))];
  },
};
