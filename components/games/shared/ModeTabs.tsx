import { CalendarDays, Infinity as InfinityIcon } from "lucide-react";
import Link from "next/link";
import type { GameSlug } from "@/lib/games/registry";
import { cn, formatShortDate } from "@/lib/utils";

/** Separa claramente "Desafío diario" de "Modo infinito". */
export function ModeTabs({
  slug,
  mode,
  number,
  date,
  today,
  infiniteExtra = "",
}: {
  slug: GameSlug;
  mode: "daily" | "infinite" | "stored";
  number?: number;
  date?: string;
  today: string;
  infiniteExtra?: string;
}) {
  const isArchive = mode === "daily" && date && date !== today;
  const tab = "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-bold transition-colors sm:gap-2 sm:px-3 sm:text-sm";
  return (
    <div className="mb-4">
      <div className="flex gap-1 rounded-xl border border-line bg-night/60 p-1" role="tablist">
        <Link href={`/juegos/${slug}`} role="tab" aria-selected={mode === "daily"} className={cn(tab, mode === "daily" ? "bg-pitch-2 text-chalk" : "text-mist hover:text-chalk")}>
          <CalendarDays className="size-4" />
          Desafío diario{mode === "daily" && number ? <span className="tabular text-gold">#{number}</span> : null}
        </Link>
        <Link
          href={`/juegos/${slug}?modo=infinito${infiniteExtra}`}
          prefetch={false}
          role="tab"
          aria-selected={mode === "infinite"}
          className={cn(tab, mode === "infinite" ? "bg-pitch-2 text-chalk" : "text-mist hover:text-chalk")}
        >
          <InfinityIcon className="size-4" />
          Modo infinito
        </Link>
      </div>
      {isArchive && (
        <p className="mt-2 text-center text-xs text-mist">
          Estás jugando el desafío del {formatShortDate(date)}.{" "}
          <Link href={`/juegos/${slug}`} className="font-bold text-grass-bright hover:underline">
            Ir al de hoy
          </Link>
        </p>
      )}
      {mode === "stored" && <p className="mt-2 text-center text-xs text-gold">Previsualización de un desafío guardado</p>}
    </div>
  );
}
