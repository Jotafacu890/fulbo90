import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { BRAND } from "@/lib/config/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span>
            <b className="text-chalk">{BRAND.name}</b> · {BRAND.secondaryTagline}
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/estadisticas" className="hover:text-chalk">
            Tus estadísticas
          </Link>
          <Link href="/admin" className="hover:text-chalk">
            Admin
          </Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-mist-2">
        Proyecto independiente de trivia. No está afiliado a clubes, ligas ni federaciones. Los nombres y colores se usan sólo con fines informativos.
      </p>
    </footer>
  );
}
