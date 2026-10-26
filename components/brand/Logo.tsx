import { BRAND } from "@/lib/config/brand";
import { cn } from "@/lib/utils";

/**
 * Isotipo cuadrado: el "90'" del reloj de partido sobre el círculo central de la cancha.
 * Funciona como ícono de app, favicon y avatar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} role="img" aria-label={BRAND.name}>
      <rect width="48" height="48" rx="11" fill="var(--color-night)" />
      <rect x="1" y="1" width="46" height="46" rx="10" fill="none" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      {/* Línea media y círculo central, apenas insinuados */}
      <line x1="1" y1="24" x2="47" y2="24" stroke="var(--color-grass)" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="13" fill="none" stroke="var(--color-grass)" strokeOpacity="0.35" strokeWidth="1.2" />
      <text
        x="22.5"
        y="32.5"
        textAnchor="middle"
        fontFamily="var(--font-archivo), sans-serif"
        fontWeight="900"
        fontSize="23"
        fill="var(--color-gold)"
        style={{ fontStretch: "75%", letterSpacing: "-0.04em" }}
      >
        {BRAND.wordmark.accent}
      </text>
      <path d="M37.5 13.5 36 19" stroke="var(--color-grass-bright)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Logotipo horizontal: FULBO en blanco tiza y el 90 en dorado, con la marca de minuto (′)
 * del reloj de partido en verde cancha como detalle futbolero.
 */
export function Logo({ className, size = "md", withMark = true }: { className?: string; size?: "md" | "lg" | "xl"; withMark?: boolean }) {
  const text = { md: "text-2xl", lg: "text-5xl", xl: "text-7xl sm:text-9xl" }[size];
  const mark = { md: "size-8", lg: "size-12", xl: "size-16 sm:size-20" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {withMark && <LogoMark className={mark} />}
      <Wordmark className={text} />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("display inline-flex items-start whitespace-nowrap leading-none tracking-tight", className)} aria-label={BRAND.name}>
      <span aria-hidden>{BRAND.wordmark.base}</span>
      <span aria-hidden className="text-gold">
        {BRAND.wordmark.accent}
      </span>
      <span aria-hidden className="-ml-[0.02em] text-[0.55em] leading-none text-grass-bright">
        ′
      </span>
    </span>
  );
}
