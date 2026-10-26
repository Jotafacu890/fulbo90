"use client";

import { FORMATIONS, type FormationName } from "@/lib/game-engine/formations";
import { cn } from "@/lib/utils";
import type { PlayerSummary } from "@/types/football";

/**
 * Cancha vertical (se ataca hacia arriba) con los casilleros de una formación.
 * Pensada para celular: casilleros de ≥44px y nombres cortos.
 */
export function FootballPitch({
  formation,
  slots,
  highlight = [],
  onSlotClick,
  disabled,
  className,
}: {
  formation: FormationName;
  slots: (PlayerSummary | null)[];
  highlight?: number[];
  onSlotClick?: (index: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const layout = FORMATIONS[formation];
  return (
    <div className={cn("relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border border-line-strong mowed", className)}>
      <svg viewBox="0 0 75 100" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke="rgba(245,247,245,0.28)" strokeWidth="0.5">
          <rect x="3" y="3" width="69" height="94" rx="0.5" />
          <line x1="3" y1="50" x2="72" y2="50" />
          <circle cx="37.5" cy="50" r="8" />
          <rect x="18" y="3" width="39" height="14" />
          <rect x="28" y="3" width="19" height="5" />
          <rect x="18" y="83" width="39" height="14" />
          <rect x="28" y="92" width="19" height="5" />
          <path d="M30 17 A8 8 0 0 0 45 17" />
          <path d="M30 83 A8 8 0 0 1 45 83" />
        </g>
        <circle cx="37.5" cy="50" r="0.7" fill="rgba(245,247,245,0.4)" />
      </svg>

      {layout.map((slot, i) => {
        const player = slots[i];
        const lit = highlight.includes(i);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || !onSlotClick || (!lit && !player)}
            onClick={() => onSlotClick?.(i)}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            className={cn("group absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1", lit && "z-10")}
            aria-label={player ? `${slot.position}: ${player.name}` : `Posición ${slot.position}${lit ? " (disponible)" : ""}`}
          >
            <span
              className={cn(
                "grid size-11 place-items-center rounded-full border-2 text-[11px] font-black transition-all sm:size-13",
                player
                  ? "animate-pop border-chalk bg-grass text-night shadow-[0_6px_18px_-6px_var(--color-grass)]"
                  : lit
                    ? "animate-pulse border-gold bg-gold/25 text-gold ring-4 ring-gold/25"
                    : "border-dashed border-chalk/40 bg-night/50 text-chalk/70",
              )}
            >
              {player ? initials(player.name) : slot.position}
            </span>
            <span
              className={cn(
                "max-w-full truncate rounded px-1 text-[10px] font-bold leading-tight sm:text-xs",
                player ? "bg-night/80 text-chalk" : "text-transparent",
              )}
            >
              {player ? shortName(player.name) : "·"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

function shortName(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}
