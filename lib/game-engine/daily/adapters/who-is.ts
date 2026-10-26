import { MIN_CLUES, type WhoIsPayload } from "../../games/who-is";
import { clubKey, playerKey } from "../keys";
import { VerificationError, type DailyAdapter } from "../types";

export const whoIsDaily: DailyAdapter<WhoIsPayload> = {
  verify(p, index) {
    if (!index.player(p.playerId)) throw new VerificationError("Jugador inexistente");
    if (p.clues.length < MIN_CLUES) throw new VerificationError("Pistas insuficientes");
    return { conditions: [], answers: [{ key: "answer", playerIds: [p.playerId] }] };
  },

  /** Las pistas deben identificar a un único jugador: nadie más puede encajar con todas. */
  ambiguity(p, index) {
    const target = index.player(p.playerId)!;
    const clubs = p.clues.map((c) => c.clubId).filter((c): c is string => Boolean(c));
    const lookalikes = index.players.filter(
      (other) =>
        other.id !== target.id &&
        other.nationality === target.nationality &&
        other.primaryPosition === target.primaryPosition &&
        other.active === target.active &&
        clubs.every((club) => index.hasPlayedFor(other.id, club)),
    );
    return lookalikes.length ? [`Las pistas también describen a ${lookalikes.map((l) => index.displayName(l.id)).join(", ")}`] : [];
  },

  difficulty(p, index) {
    const fame = index.fame(p.playerId);
    return fame >= 22 ? 1 : fame >= 12 ? 2 : 3;
  },

  repeatKeys(p) {
    return [playerKey(p.playerId)];
  },

  contentKeys(p) {
    return [playerKey(p.playerId), ...p.clues.map((c) => c.clubId).filter((c): c is string => Boolean(c)).map(clubKey)];
  },
};
