/**
 * Catálogo de juegos. Es metadata pura (sin lógica ni datos) para poder usarla en cliente y servidor.
 * Agregar un juego nuevo = sumar una entrada acá + su carpeta en components/games y lib/game-engine/games.
 */
export type GameSlug =
  | "el-11"
  | "grid"
  | "quien-es"
  | "impostor"
  | "conexiones"
  | "piramide"
  | "trayectoria"
  | "que-club-es"
  | "xi-historico"
  | "de-donde-salio"
  | "eslabon-perdido"
  | "duelo"
  | "camino"
  | "libertadores"
  | "superclasico";

export type GameStatus = "available" | "soon";
export type Difficulty = 1 | 2 | 3;

export interface GameMeta {
  slug: GameSlug;
  name: string;
  tagline: string;
  description: string;
  icon: GameIconName;
  difficulty: Difficulty;
  status: GameStatus;
  /** Día del desafío #1 (America/Argentina/Buenos_Aires). */
  launchDate: string;
  /** Destacado en la home (modos especiales). */
  featured?: boolean;
  /** Forma parte del desafío diario. */
  daily: boolean;
  accent: "green" | "gold" | "sky" | "red";
}

export type GameIconName =
  | "lineup"
  | "grid"
  | "question"
  | "impostor"
  | "connections"
  | "pyramid"
  | "path"
  | "shield"
  | "history"
  | "seed"
  | "link"
  | "versus"
  | "route"
  | "trophy"
  | "derby";

export const GAMES: GameMeta[] = [
  {
    slug: "grid",
    name: "Grid Sudamericano",
    tagline: "Cruzá clubes y logros en una grilla 3×3.",
    description: "Encontrá un futbolista para cada cruce de fila y columna. Cuanto menos elegido, mejor tu rareza.",
    icon: "grid",
    difficulty: 3,
    status: "available",
    launchDate: "2026-06-01",
    daily: true,
    accent: "green",
  },
  {
    slug: "el-11",
    name: "El 11",
    tagline: "Armá un once con jugadores de cada club.",
    description: "Te mostramos un club por vez: elegí a alguien que haya jugado ahí y ubicalo en una posición compatible.",
    icon: "lineup",
    difficulty: 2,
    status: "available",
    launchDate: "2026-07-01",
    daily: true,
    accent: "gold",
  },
  {
    slug: "quien-es",
    name: "¿Quién es?",
    tagline: "Adiviná el futbolista con pistas progresivas.",
    description: "Cada error destapa una pista nueva. Cuantas menos pistas uses, más puntos.",
    icon: "question",
    difficulty: 2,
    status: "available",
    launchDate: "2026-07-29",
    daily: true,
    accent: "sky",
  },
  {
    slug: "impostor",
    name: "Impostor",
    tagline: "Cuatro comparten algo. Uno no.",
    description: "Cinco rondas: encontrá al jugador que no cumple la condición.",
    icon: "impostor",
    difficulty: 1,
    status: "available",
    launchDate: "2026-07-11",
    daily: true,
    accent: "red",
  },
  {
    slug: "superclasico",
    name: "Superclásico",
    tagline: "Todo River–Boca: jugadores, goles, finales y récords.",
    description: "El modo más picante del sitio: preguntas sobre la historia del River–Boca.",
    icon: "derby",
    difficulty: 3,
    status: "soon",
    launchDate: "2026-12-01",
    featured: true,
    daily: false,
    accent: "gold",
  },
  {
    slug: "libertadores",
    name: "Modo Libertadores",
    tagline: "Campeones, finales, goleadores y cruces históricos.",
    description: "Un modo dedicado exclusivamente a la Copa.",
    icon: "trophy",
    difficulty: 3,
    status: "soon",
    launchDate: "2026-12-01",
    featured: true,
    daily: false,
    accent: "gold",
  },
  { slug: "conexiones", name: "Conexiones", tagline: "16 jugadores, 4 grupos ocultos.", description: "Dividí a los futbolistas en cuatro grupos que comparten una característica.", icon: "connections", difficulty: 3, status: "soon", launchDate: "2026-12-01", daily: false, accent: "green" },
  { slug: "piramide", name: "Pirámide", tagline: "Ordená jugadores según una métrica.", description: "Goles, partidos, títulos: arrastrá y confirmá el orden.", icon: "pyramid", difficulty: 2, status: "soon", launchDate: "2026-12-01", daily: false, accent: "sky" },
  { slug: "trayectoria", name: "Trayectoria", tagline: "Marcá todos los clubes donde jugó.", description: "Un jugador, varios escudos: elegí todos los clubes de su carrera.", icon: "path", difficulty: 2, status: "soon", launchDate: "2026-12-01", daily: false, accent: "green" },
  { slug: "que-club-es", name: "¿Qué club es?", tagline: "Adiviná el club con pistas.", description: "País, ciudad, títulos, apodo del estadio…", icon: "shield", difficulty: 1, status: "soon", launchDate: "2026-12-01", daily: false, accent: "sky" },
  { slug: "xi-historico", name: "XI Histórico", tagline: "Completá los titulares de una final.", description: "Finales de Libertadores, Mundiales e Intercontinentales.", icon: "history", difficulty: 3, status: "soon", launchDate: "2026-12-01", daily: false, accent: "gold" },
  { slug: "de-donde-salio", name: "¿De dónde salió?", tagline: "Club de formación o de debut.", description: "Elegí el club donde se formó el jugador.", icon: "seed", difficulty: 1, status: "soon", launchDate: "2026-12-01", daily: false, accent: "green" },
  { slug: "eslabon-perdido", name: "Eslabón perdido", tagline: "Completá la trayectoria incompleta.", description: "Falta un club en la carrera: ¿cuál es?", icon: "link", difficulty: 2, status: "soon", launchDate: "2026-12-01", daily: false, accent: "red" },
  { slug: "duelo", name: "Duelo", tagline: "10 duelos rápidos, uno contra otro.", description: "¿Quién hizo más goles? ¿Quién jugó más partidos?", icon: "versus", difficulty: 1, status: "soon", launchDate: "2026-12-01", daily: false, accent: "red" },
  { slug: "camino", name: "Camino", tagline: "Sólo la trayectoria: ¿quién es?", description: "Newell's → Barcelona → PSG → Inter Miami…", icon: "route", difficulty: 2, status: "soon", launchDate: "2026-12-01", daily: false, accent: "sky" },
];

export const AVAILABLE_GAMES = GAMES.filter((g) => g.status === "available");
export const DAILY_GAMES = GAMES.filter((g) => g.daily && g.status === "available");

export function getGame(slug: string): GameMeta | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Fácil", 2: "Media", 3: "Difícil" };
