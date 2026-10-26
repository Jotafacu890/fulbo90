import type { GameSlug } from "./registry";

export const GAME_RULES: Partial<Record<GameSlug, string[]>> = {
  grid: [
    "Cada celda cruza una fila y una columna: buscá un futbolista que cumpla las dos condiciones.",
    "Cada jugador se puede usar una sola vez en la grilla.",
    "Tenés 12 intentos en total. Un error gasta un intento.",
    "Rareza: cuanto menos elegido sea tu jugador, menor el porcentaje. Las celdas vacías suman 100. ¡Buscá el puntaje más bajo!",
  ],
  "el-11": [
    "Elegí una formación. Te vamos mostrando un club (o una condición) por vez.",
    "Buscá un jugador que cumpla la consigna y ubicalo en una posición compatible con las suyas.",
    "Cada posición se ocupa una sola vez y cada jugador se usa una sola vez.",
    "Tenés 3 vidas y podés pasar 3 consignas. Opcional: jugá contra reloj.",
  ],
  "quien-es": [
    "Adiviná el futbolista. Arrancás con una pista.",
    "Cada error (o cada vez que pedís otra pista) destapa la siguiente.",
    "Cuantas menos pistas uses, más puntos: 100, 80, 60, 45, 30, 15.",
  ],
  impostor: [
    "En cada ronda hay cinco jugadores: cuatro cumplen la consigna y uno no.",
    "Tocá al impostor. Después de responder vas a ver la explicación.",
    "Son 5 rondas: ¿cuántos impostores descubrís?",
  ],
};
