import { evaluate } from "../../conditions";
import type { ImpostorPayload } from "../../games/impostor";
import { conditionKey, entityKeys, playerKey } from "../keys";
import { VerificationError, type DailyAdapter } from "../types";

export const impostorDaily: DailyAdapter<ImpostorPayload> = {
  verify(p, index) {
    p.rounds.forEach((r, i) => {
      const fits = r.options.filter((o) => evaluate(r.condition, o, index));
      if (fits.length !== 4 || fits.includes(r.impostorId)) throw new VerificationError(`Ronda ${i + 1}: no hay exactamente 4 que cumplen y 1 impostor`);
    });
    return {
      conditions: p.rounds.map((r, i) => ({ key: `round-${i}`, label: r.prompt, condition: r.condition })),
      answers: p.rounds.map((r, i) => ({ key: `round-${i}`, playerIds: [r.impostorId] })),
    };
  },

  ambiguity(p) {
    const problems: string[] = [];
    const conds = p.rounds.map((r) => conditionKey(r.condition));
    if (new Set(conds).size !== conds.length) problems.push("Dos rondas usan la misma consigna");
    const players = p.rounds.flatMap((r) => r.options);
    if (new Set(players).size !== players.length) problems.push("Un jugador aparece en más de una ronda");
    return problems;
  },

  /** Cuanto menos conocidos son los que cumplen la consigna, más difícil reconocer al impostor. */
  difficulty(p, index) {
    const members = p.rounds.flatMap((r) => r.options.filter((o) => o !== r.impostorId));
    const avg = members.reduce((s, m) => s + index.fame(m), 0) / members.length;
    return avg >= 20.5 ? 1 : avg >= 19 ? 2 : 3;
  },

  repeatKeys(p) {
    return p.rounds.flatMap((r) => [`impostor:${r.impostorId}`, `round:${conditionKey(r.condition)}:${r.impostorId}`]);
  },

  contentKeys(p) {
    return [...new Set(p.rounds.flatMap((r) => [conditionKey(r.condition), ...entityKeys(r.condition), ...r.options.map(playerKey)]))];
  },
};
