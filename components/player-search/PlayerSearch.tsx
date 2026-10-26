"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Flag } from "@/components/ui/Flag";
import { POSITION_LABELS } from "@/lib/game-engine/positions";
import { cn } from "@/lib/utils";
import type { PlayerSummary } from "@/types/football";

/**
 * Buscador reutilizable de futbolistas: sin tildes ni mayúsculas, tolerante a errores,
 * navegación con flechas, Enter para elegir y Escape para cerrar.
 */
export function PlayerSearch({
  onSelect,
  disabledIds = [],
  placeholder = "Escribí un jugador…",
  autoFocus,
  disabled,
  className,
  renderHint,
}: {
  onSelect: (player: PlayerSummary) => void;
  disabledIds?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  /** Texto auxiliar por jugador (p. ej. "no tenés lugar para un arquero"). Si devuelve string, se deshabilita. */
  renderHint?: (player: PlayerSummary) => string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/jugadores?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = (await res.json()) as PlayerSummary[];
        setResults(data);
        setActive(0);
        setOpen(true);
      } catch {
        // búsqueda cancelada o sin red
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  const isDisabled = (p: PlayerSummary) => disabledIds.includes(p.id) || Boolean(renderHint?.(p));

  const choose = (p: PlayerSummary | undefined) => {
    if (!p || isDisabled(p)) return;
    onSelect(p);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2 && !loading;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-mist" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLoading(e.target.value.trim().length >= 2);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          data-autofocus={autoFocus ? "" : undefined}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${results[active].id}` : undefined}
          className="h-13 w-full rounded-xl border border-line-strong bg-night/80 pl-11 pr-10 text-base font-semibold text-chalk placeholder:font-normal placeholder:text-mist-2 focus:border-grass focus:outline-none disabled:opacity-50"
        />
        {loading && <span className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-mist/40 border-t-grass" aria-hidden />}
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="card absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto p-1.5 shadow-2xl shadow-black/60">
          {results.length === 0 && !loading && <li className="px-3 py-3 text-sm text-mist">Sin resultados para “{query}”</li>}
          {results.map((p, i) => {
            const used = disabledIds.includes(p.id);
            const hint = used ? "Ya lo usaste" : renderHint?.(p);
            return (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={Boolean(hint)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
                  i === active && !hint && "bg-pitch-2",
                  hint && "cursor-not-allowed opacity-45",
                )}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                  <span className="grid size-9 place-items-center rounded-full bg-pitch text-xs font-black text-mist">{initials(p.name)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-mist">
                    <Flag code={p.nationality} className="h-3 w-4" />
                    {hint ?? p.positions.map((pos) => POSITION_LABELS[pos]).join(" · ")}
                  </span>
                </span>
                {!p.active && <span className="text-[10px] font-bold uppercase tracking-wider text-mist-2">Retirado</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
