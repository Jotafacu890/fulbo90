import { describeCondition, findMatchingPlayers } from "../../conditions";
import type { ElevenPayload } from "../../games/starting-eleven";
import { conditionKey, entityKeys, fingerprint } from "../keys";
import { maxDistinctAssignment, median } from "../matching";
import { VerificationError, type DailyAdapter } from "../types";

export const elevenDaily: DailyAdapter<ElevenPayload> = {
  verify(p, index) {
    const answers = p.prompts.map((pr, i) => ({ key: `prompt-${i}`, playerIds: findMatchingPlayers(pr.condition, index) }));
    const weak = answers.find((a) => a.playerIds.length < 3);
    if (weak) throw new VerificationError(`${weak.key} con menos de 3 respuestas`);
    if (maxDistinctAssignment(answers.map((a) => a.playerIds)) < 11) throw new VerificationError("No alcanzan jugadores distintos para completar el once");
    return {
      conditions: p.prompts.map((pr, i) => ({ key: `prompt-${i}`, label: describeCondition(pr.condition, index), condition: pr.condition })),
      answers,
    };
  },

  ambiguity(p) {
    const keys = p.prompts.map((pr) => conditionKey(pr.condition));
    return new Set(keys).size === keys.length ? [] : ["Hay consignas repetidas"];
  },

  difficulty(_p, _index, verification) {
    const m = median(verification.answers.map((a) => a.playerIds.length));
    // Umbrales calibrados con los terciles de respuestas por consigna.
    return m >= 10 ? 1 : m >= 7.5 ? 2 : 3;
  },

  repeatKeys(p) {
    return [`fp:${p.variant}:${fingerprint(p.prompts.map((pr) => conditionKey(pr.condition)))}`];
  },

  contentKeys(p) {
    return [...new Set(p.prompts.flatMap((pr) => [conditionKey(pr.condition), ...entityKeys(pr.condition)]))];
  },
};
