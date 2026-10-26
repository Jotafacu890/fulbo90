import { BRAND } from "@/lib/config/brand";

/**
 * Textos para compartir: muestran el resultado sin revelar respuestas.
 *
 * ⚽ FULBO90
 * GRID #124
 * 🟩🟩🟩
 * 🟩🟨🟩
 * 🟩🟩🟩
 * 8/9 aciertos
 * 🔥 Racha: 7 días
 * ¿Cuánto sabés de fulbo?
 */
interface ShareBase {
  gameName: string;
  number?: number;
  infinite?: boolean;
  streak?: number;
}

function header({ gameName, number, infinite }: ShareBase) {
  const edition = infinite ? " · MODO INFINITO" : number ? ` #${number}` : "";
  return `${BRAND.shareEmoji} ${BRAND.name}\n${gameName.toUpperCase()}${edition}`;
}

function footer({ streak, infinite }: ShareBase) {
  const lines: string[] = [];
  if (!infinite && streak && streak > 0) lines.push(`🔥 Racha: ${streak} ${streak === 1 ? "día" : "días"}`);
  lines.push(BRAND.tagline);
  const host = BRAND.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!host.startsWith("localhost")) lines.push(host);
  return `\n${lines.join("\n")}`;
}

/** cells: "ok" acierto directo · "late" acierto después de errar en esa celda · "miss" vacía. */
export type GridCellResult = "ok" | "late" | "miss";

export function gridShareText(base: ShareBase & { cells: GridCellResult[][]; score: number; rarity: number }) {
  const icon = { ok: "🟩", late: "🟨", miss: "🟥" };
  const rows = base.cells.map((row) => row.map((c) => icon[c]).join("")).join("\n");
  return `${header(base)}\n${rows}\n${base.score}/9 aciertos · Rareza ${base.rarity}${footer(base)}`;
}

export function elevenShareText(base: ShareBase & { lines: boolean[][]; score: number; formation: string; timeLabel?: string }) {
  // Las líneas van del arco rival al propio, como se ve la cancha.
  const rows = base.lines.map((line) => line.map((ok) => (ok ? "🟢" : "⚫")).join("")).join("\n");
  const time = base.timeLabel ? ` · ⏱ ${base.timeLabel}` : "";
  return `${header(base)}\n${base.formation}\n${rows}\n${base.score}/11 aciertos${time}${footer(base)}`;
}

export function whoIsShareText(base: ShareBase & { cluesUsed: number; totalClues: number; won: boolean; points: number }) {
  const bar = Array.from({ length: base.totalClues }, (_, i) => (i < base.cluesUsed - 1 ? "🟥" : i === base.cluesUsed - 1 ? (base.won ? "🟩" : "🟥") : "⬜")).join("");
  const result = base.won ? `Lo saqué con ${base.cluesUsed}/${base.totalClues} pistas · ${base.points} pts` : `No lo saqué (${base.totalClues} pistas)`;
  return `${header(base)}\n${bar}\n${result}${footer(base)}`;
}

export function impostorShareText(base: ShareBase & { results: boolean[] }) {
  const ok = base.results.filter(Boolean).length;
  return `${header(base)}\n${base.results.map((r) => (r ? "🟩" : "🟥")).join("")}\n${ok}/${base.results.length} aciertos${footer(base)}`;
}

/** Comparte con la hoja nativa en celulares y copia al portapapeles en desktop. */
export async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch {
      // cancelado: probamos copiar
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
