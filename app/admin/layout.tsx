import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/database/prisma";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const NAV = [
  ["/admin", "Resumen"],
  ["/admin/jugadores", "Jugadores"],
  ["/admin/clubes", "Clubes"],
  ["/admin/competiciones", "Competiciones"],
  ["/admin/partidos", "Partidos"],
  ["/admin/calendario", "Calendario"],
  ["/admin/desafios", "Desafíos"],
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="display mr-4 text-4xl">Admin</h1>
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-mist hover:border-grass hover:text-chalk">
            {label}
          </Link>
        ))}
      </div>
      <Suspense fallback={null}>
        <DbBanner />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}

/** Autorización real del panel: rol ADMIN verificado contra Neon en cada request. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, allowed } = await getAdminAccess();
  if (!allowed && !user) redirect("/ingresar?next=/admin");
  if (!allowed) {
    return (
      <p className="card p-6 text-sm text-mist">
        Tu cuenta (<b className="text-chalk">{user?.email}</b>) no tiene permisos de administración. Pedile a un admin que te habilite o usá <code>npm run admin:create</code>.
      </p>
    );
  }
  return <>{children}</>;
}

async function DbBanner() {
  if (isDatabaseConfigured()) return null;
  return (
    <p className="mb-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
      Modo de sólo lectura: estás viendo los datos estáticos de <code>/data</code>. Configurá <code>DATABASE_URL</code> (Neon), corré{" "}
      <code>npm run db:deploy</code> y <code>npm run db:seed</code> para editar.
    </p>
  );
}
