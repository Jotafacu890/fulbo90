import { cn } from "@/lib/utils";

/**
 * Escudo genérico con los colores del club y sus iniciales. No reproduce escudos oficiales:
 * cuando haya derechos sobre los logos se puede pasar logoUrl.
 */
export function ClubBadge({
  name,
  colors = ["#1FA463", "#F5F7F5"],
  logoUrl,
  className,
}: {
  name: string;
  colors?: [string, string];
  logoUrl?: string;
  className?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name} className={cn("size-10 object-contain", className)} />;
  }
  const [primary, secondary] = colors;
  const initials = initialsOf(name);
  const light = isLight(primary);
  return (
    <svg viewBox="0 0 40 46" className={cn("size-10 shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]", className)} role="img" aria-label={name}>
      <path d="M20 1.5 37 7v15.5C37 33 29.5 40.6 20 44.5 10.5 40.6 3 33 3 22.5V7z" fill={primary} stroke={secondary} strokeWidth="2.5" />
      <path d="M20 1.5 37 7v15.5C37 33 29.5 40.6 20 44.5z" fill={secondary} opacity="0.22" />
      <text
        x="20"
        y="26.5"
        textAnchor="middle"
        fontSize={initials.length > 2 ? 11 : 13}
        fontWeight="900"
        fontFamily="var(--font-archivo), sans-serif"
        fill={light ? "#0b1a12" : "#ffffff"}
        style={{ letterSpacing: "-0.04em" }}
      >
        {initials}
      </text>
    </svg>
  );
}

function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\s'-]/gu, "")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !["de", "del", "la", "los", "club", "fc", "the"].includes(w.toLowerCase()));
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
