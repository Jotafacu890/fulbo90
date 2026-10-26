import { LogIn, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/database/prisma";

/** Lee la cookie de sesión: se renderiza dentro de <Suspense> en el header. */
export async function UserMenu() {
  if (!isDatabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/ingresar" className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-pitch hover:text-chalk sm:px-3" aria-label="Ingresar">
        <LogIn className="size-4" />
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-1">
      {user.role === "ADMIN" && (
        <Link href="/admin" className="rounded-lg p-2 hover:bg-pitch hover:text-chalk" aria-label="Panel de administración">
          <Shield className="size-4" />
        </Link>
      )}
      <span className="hidden max-w-28 truncate text-chalk md:inline">{user.displayName}</span>
      <form action={logout}>
        <button className="rounded-lg p-2 hover:bg-pitch hover:text-chalk" aria-label="Salir" title="Salir">
          <LogOut className="size-4" />
        </button>
      </form>
    </span>
  );
}
