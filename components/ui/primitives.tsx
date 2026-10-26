import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProgressBar({ value, max, className, tone = "grass" }: { value: number; max: number; className?: string; tone?: "grass" | "gold" | "danger" }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = tone === "gold" ? "bg-gold" : tone === "danger" ? "bg-danger" : "bg-grass";
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-pitch", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "grass" | "gold" | "danger" | "sky"; className?: string }) {
  const tones = {
    default: "border-line-strong text-mist",
    grass: "border-grass/40 bg-grass/10 text-grass-bright",
    gold: "border-gold/40 bg-gold/10 text-gold",
    danger: "border-danger/40 bg-danger/10 text-danger",
    sky: "border-sky/40 bg-sky/10 text-sky",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", tones[tone], className)}>{children}</span>;
}

/** Tooltip sólo con CSS: aparece al pasar el mouse o al enfocar (también funciona con teclado). */
export function Tooltip({ content, children, className }: { content: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-56 -translate-x-1/2 rounded-lg border border-line-strong bg-night px-2.5 py-1.5 text-center text-xs font-medium normal-case tracking-normal text-chalk opacity-0 shadow-xl transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}

export function DifficultyDots({ level, className }: { level: 1 | 2 | 3; className?: string }) {
  const label = level === 1 ? "Fácil" : level === 2 ? "Media" : "Difícil";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist", className)} title={`Dificultad ${label}`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-2.5 w-1.5 rounded-sm", i <= level ? (level === 3 ? "bg-danger" : level === 2 ? "bg-gold" : "bg-grass") : "bg-line-strong")} />
        ))}
      </span>
      {label}
    </span>
  );
}

export function StatTile({ label, value, hint, className }: { label: string; value: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-night/60 px-3 py-3 text-center", className)}>
      <div className="display tabular text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-mist">{label}</div>
      {hint && <div className="text-[11px] text-mist-2">{hint}</div>}
    </div>
  );
}
