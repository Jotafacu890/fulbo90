import { countryName } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Banderas simplificadas en SVG (propias, sin assets externos ni emojis, que en Windows no se ven).
 * Proporción 3:2 normalizada a 30×20.
 */
const H3 = (a: string, b: string, c: string) => (
  <>
    <rect width="30" height="6.67" fill={a} />
    <rect y="6.67" width="30" height="6.67" fill={b} />
    <rect y="13.33" width="30" height="6.67" fill={c} />
  </>
);
const V3 = (a: string, b: string, c: string) => (
  <>
    <rect width="10" height="20" fill={a} />
    <rect x="10" width="10" height="20" fill={b} />
    <rect x="20" width="10" height="20" fill={c} />
  </>
);

const FLAGS: Record<string, React.ReactNode> = {
  AR: (
    <>
      {H3("#74ACDF", "#FFFFFF", "#74ACDF")}
      <circle cx="15" cy="10" r="2.2" fill="#F6B40E" />
    </>
  ),
  UY: (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[2.22, 6.67, 11.11, 15.56].map((y) => (
        <rect key={y} y={y} width="30" height="2.22" fill="#0038A8" />
      ))}
      <rect width="11" height="11.1" fill="#fff" />
      <circle cx="5.5" cy="5.5" r="2.6" fill="#FCD116" />
    </>
  ),
  BR: (
    <>
      <rect width="30" height="20" fill="#009C3B" />
      <polygon points="15,2.5 27,10 15,17.5 3,10" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4.2" fill="#002776" />
    </>
  ),
  CL: (
    <>
      <rect width="30" height="10" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#D52B1E" />
      <rect width="10" height="10" fill="#0039A6" />
      <circle cx="5" cy="5" r="1.6" fill="#fff" />
    </>
  ),
  CO: (
    <>
      <rect width="30" height="10" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </>
  ),
  PY: H3("#D52B1E", "#FFFFFF", "#0038A8"),
  EC: (
    <>
      <rect width="30" height="10" fill="#FFD100" />
      <rect y="10" width="30" height="5" fill="#034EA2" />
      <rect y="15" width="30" height="5" fill="#ED1C24" />
      <circle cx="15" cy="10" r="2.2" fill="#6b4f1d" />
    </>
  ),
  PE: V3("#D91023", "#FFFFFF", "#D91023"),
  BO: H3("#D52B1E", "#F9E300", "#007934"),
  VE: (
    <>
      {H3("#FFCC00", "#00247D", "#CF142B")}
      <path d="M9 12 Q15 6 21 12" stroke="#fff" strokeWidth="0.9" strokeDasharray="0.9 1.2" fill="none" />
    </>
  ),
  ES: (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  IT: V3("#009246", "#FFFFFF", "#CE2B37"),
  FR: V3("#0055A4", "#FFFFFF", "#EF4135"),
  DE: H3("#000000", "#DD0000", "#FFCE00"),
  NL: H3("#AE1C28", "#FFFFFF", "#21468B"),
  PT: (
    <>
      <rect width="12" height="20" fill="#006600" />
      <rect x="12" width="18" height="20" fill="#FF0000" />
      <circle cx="12" cy="10" r="3" fill="#FFCC00" />
    </>
  ),
  EN: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect x="13" width="4" height="20" fill="#CE1124" />
      <rect y="8" width="30" height="4" fill="#CE1124" />
    </>
  ),
  BE: V3("#000000", "#FDDA24", "#EF3340"),
  MX: (
    <>
      {V3("#006847", "#FFFFFF", "#CE1126")}
      <circle cx="15" cy="10" r="1.8" fill="#8c6a2f" />
    </>
  ),
  US: (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 2.86} width="30" height="1.43" fill="#B22234" />
      ))}
      <rect width="13" height="10" fill="#3C3B6E" />
    </>
  ),
};

export function Flag({ code, className, title }: { code: string; className?: string; title?: string }) {
  const content = FLAGS[code];
  const label = title ?? countryName(code);
  if (!content) {
    return (
      <span className={cn("inline-grid h-3.5 w-5 place-items-center rounded-[3px] bg-line-strong text-[8px] font-bold", className)} title={label}>
        {code}
      </span>
    );
  }
  return (
    <svg viewBox="0 0 30 20" className={cn("inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/30", className)} role="img" aria-label={label}>
      <title>{label}</title>
      {content}
    </svg>
  );
}
