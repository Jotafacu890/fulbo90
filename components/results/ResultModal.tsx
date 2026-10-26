"use client";

import { Check, Copy, Flame, Shuffle, Share2, Trophy } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { NextDailyCountdown } from "@/components/layout/NextDailyCountdown";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/primitives";
import { COPY } from "@/lib/config/copy";
import { shareText } from "@/lib/share";

export interface ResultStat {
  label: string;
  value: ReactNode;
  hint?: string;
}

/** Modal de fin de partida: racha, resultado, tiempo, rareza y botón COMPARTIR. */
export function ResultModal({
  open,
  onClose,
  title,
  subtitle,
  streak,
  stats,
  share,
  playAgainHref,
  isDaily,
  newRecord,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  streak?: number;
  stats: ResultStat[];
  share: string;
  playAgainHref: string;
  isDaily: boolean;
  newRecord?: boolean;
  children?: ReactNode;
}) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared" | "failed">("idle");

  const onShare = async () => {
    const result = await shareText(share);
    setShareState(result);
    window.setTimeout(() => setShareState("idle"), 2200);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {subtitle && <div className="-mt-2 mb-4 text-sm text-mist">{subtitle}</div>}

      {newRecord && (
        <div className="mb-3 flex animate-pop items-center gap-3 rounded-xl border border-grass/40 bg-grass/10 px-4 py-3">
          <Trophy className="size-7 text-grass-bright" aria-hidden />
          <div>
            <div className="display text-2xl text-grass-bright">{COPY.newRecord}</div>
            <div className="text-xs text-mist">Mejoraste tu mejor marca en este juego</div>
          </div>
        </div>
      )}

      {isDaily && streak !== undefined && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
          <Flame className="size-7 text-gold" aria-hidden />
          <div>
            <div className="display text-2xl text-gold">
              {streak > 1 ? `${COPY.streak} ` : ""}Racha: {streak} {streak === 1 ? "día" : "días"}
            </div>
            <div className="text-xs text-mist">Días seguidos completando este desafío</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} hint={s.hint} />
        ))}
      </div>

      {children && <div className="mt-4">{children}</div>}

      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-line bg-night/70 p-3 text-center font-sans text-sm leading-relaxed text-chalk/90">{share}</pre>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="gold" size="lg" onClick={onShare} className="w-full">
          {shareState === "copied" ? <Check className="size-5" /> : shareState === "shared" ? <Check className="size-5" /> : <Share2 className="size-5" />}
          {shareState === "copied" ? "¡Copiado!" : shareState === "shared" ? "¡Listo!" : shareState === "failed" ? "No se pudo copiar" : "Compartir"}
        </Button>
        <ButtonLink href={playAgainHref} variant="outline" size="lg" className="w-full" prefetch={false}>
          <Shuffle className="size-5" />
          Jugar de nuevo
        </ButtonLink>
      </div>
      {shareState === "failed" && (
        <p className="mt-2 flex items-center gap-1 text-xs text-mist">
          <Copy className="size-3" /> Seleccioná el texto de arriba para copiarlo.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        {isDaily ? <NextDailyCountdown label="Próximo desafío en" /> : <span className="text-xs text-mist">Modo infinito: desafíos ilimitados</span>}
        <Link href="/" className="text-sm font-bold text-grass-bright hover:underline">
          Ver todos los desafíos →
        </Link>
      </div>
    </Modal>
  );
}
