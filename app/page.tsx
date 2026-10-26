import { Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { StreakStrip } from "@/components/home/StreakStrip";
import { DailyChallenge } from "@/components/home/DailyChallenge";
import { GameCard } from "@/components/home/GameCard";
import { Badge } from "@/components/ui/primitives";
import { BRAND } from "@/lib/config/brand";
import { GAMES } from "@/lib/games/registry";

export default function HomePage() {
  const available = GAMES.filter((g) => g.status === "available");
  const featured = GAMES.filter((g) => g.featured);
  const upcoming = GAMES.filter((g) => g.status === "soon" && !g.featured);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="relative pb-8 pt-10 sm:pb-12 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-[0.07]" aria-hidden>
          <svg viewBox="0 0 400 200" className="size-full" preserveAspectRatio="xMidYMid slice">
            <g fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="10" y="10" width="380" height="180" />
              <line x1="200" y1="10" x2="200" y2="190" />
              <circle cx="200" cy="100" r="34" />
              <rect x="10" y="55" width="50" height="90" />
              <rect x="340" y="55" width="50" height="90" />
            </g>
          </svg>
        </div>
        <Badge tone="gold">Fútbol argentino · Sudamérica</Badge>
        <h1 className="mt-5">
          <Wordmark className="text-7xl sm:text-9xl" />
        </h1>
        <p className="display mt-4 text-3xl text-chalk sm:text-5xl">{BRAND.tagline}</p>
        <p className="mt-3 max-w-xl text-lg font-semibold text-chalk/85 sm:text-xl">{BRAND.description}</p>
        <p className="mt-1 text-sm italic text-mist">{BRAND.secondaryTagline}</p>
        <StreakStrip className="mt-6" />
      </section>

      <DailyChallenge />

      {/* Modos destacados */}
      <section className="mt-10 grid gap-3 md:grid-cols-2">
        {featured.map((g) => (
          <Link
            key={g.slug}
            href={`/juegos/${g.slug}`}
            className="card group relative overflow-hidden p-6 transition-colors hover:border-gold/50"
          >
            <div className="pointer-events-none absolute -bottom-10 -right-6 opacity-10 transition-opacity group-hover:opacity-20" aria-hidden>
              {g.slug === "superclasico" ? <Swords className="size-44" /> : <Trophy className="size-44" />}
            </div>
            <Badge tone="gold">Modo destacado · Próximamente</Badge>
            <h3 className="display mt-3 text-4xl sm:text-5xl">{g.name}</h3>
            <p className="mt-2 max-w-sm text-mist">{g.tagline}</p>
          </Link>
        ))}
      </section>

      <section id="juegos" className="mt-12 scroll-mt-20">
        <h2 className="display text-4xl">Juegos</h2>
        <p className="mt-1 text-mist">Cada juego tiene su desafío diario y un modo infinito para seguir jugando.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {available.map((g, i) => (
            <GameCard key={g.slug} game={g} index={i} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="display text-3xl text-mist">En el vestuario</h2>
        <p className="mt-1 text-sm text-mist-2">Próximos juegos en desarrollo.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((g, i) => (
            <GameCard key={g.slug} game={g} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
