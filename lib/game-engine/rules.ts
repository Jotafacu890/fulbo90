/** Reglas numéricas de cada juego. Las aplica el servidor (tickets) y las muestra el cliente. */
export const GRID_MAX_ATTEMPTS = 12;
export const ELEVEN_LIVES = 3;
export const ELEVEN_SKIP_COUNT = 3;
export const ELEVEN_TIMERS = [0, 120, 90, 60] as const;
/** Margen para la latencia de red al vencer el cronómetro. */
export const ELEVEN_TIMER_GRACE_MS = 3000;
