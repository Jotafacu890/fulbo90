/**
 * Calendario del desafío diario. Todos los usuarios ven el mismo desafío durante el día argentino:
 * a las 00:00 de Buenos Aires se habilita el siguiente.
 */
export const DAILY_TIMEZONE = "America/Argentina/Buenos_Aires";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DAILY_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha (yyyy-mm-dd) en Argentina para un instante dado. */
export function argentinaDate(now: Date = new Date()): string {
  return dateFormatter.format(now);
}

const toUtcDays = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

export function addDays(isoDate: string, days: number): string {
  const ms = (toUtcDays(isoDate) + days) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return toUtcDays(to) - toUtcDays(from);
}

/** Número de edición: el día de lanzamiento del juego es el #1. */
export function challengeNumber(date: string, launchDate: string): number {
  return daysBetween(launchDate, date) + 1;
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/**
 * Milisegundos hasta la medianoche argentina. Argentina no usa horario de verano (UTC-3 fijo),
 * pero se calcula con Intl para no depender de esa suposición.
 */
export function msUntilNextDaily(now: Date = new Date()): number {
  const tomorrow = addDays(argentinaDate(now), 1);
  // Buscamos el primer minuto en que la fecha argentina cambia (precisión de un minuto es suficiente).
  let guess = Date.parse(`${tomorrow}T03:00:00Z`);
  while (argentinaDate(new Date(guess - 60_000)) === tomorrow) guess -= 60_000;
  while (argentinaDate(new Date(guess)) !== tomorrow) guess += 60_000;
  return Math.max(0, guess - now.getTime());
}
