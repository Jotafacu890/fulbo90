import { ChartColumn } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/lib/config/brand";
import { Suspense } from "react";
import { NextDailyCountdown } from "./NextDailyCountdown";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-night/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="rounded-md" aria-label={`${BRAND.name} — inicio`}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-mist">
          <span className="mr-2 hidden md:block">
            <NextDailyCountdown />
          </span>
          <Link href="/#juegos" className="rounded-lg px-2.5 py-2 transition-colors hover:bg-pitch hover:text-chalk sm:px-3">
            Juegos
          </Link>
          <Link href="/estadisticas" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-pitch hover:text-chalk sm:px-3" aria-label="Estadísticas">
            <ChartColumn className="size-4" />
            <span className="hidden sm:inline">Estadísticas</span>
          </Link>
          <Suspense fallback={<span className="w-9" />}>
            <UserMenu />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
