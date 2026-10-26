import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getPrisma, isDatabaseConfigured } from "@/lib/database/prisma";
import { SESSION_COOKIE } from "./constants";

const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea la sesión en Neon y deja el token en una cookie httpOnly (nunca accesible desde JS). */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await getPrisma().session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Usuario de la request actual (memoizado por request con React cache). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isDatabaseConfigured()) return null;
  // Siempre en tiempo de request (nunca durante el prerender).
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getPrisma().session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const { id, email, displayName, role } = session.user;
  return { id, email, displayName, role };
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && isDatabaseConfigured()) {
    await getPrisma().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/**
 * Autorización del panel. Sin base de datos (desarrollo con datos estáticos) el admin es de sólo
 * lectura y se permite verlo localmente; en producción siempre exige un usuario con rol ADMIN.
 */
export async function getAdminAccess(): Promise<{ user: SessionUser | null; allowed: boolean }> {
  if (!isDatabaseConfigured()) return { user: null, allowed: process.env.NODE_ENV !== "production" };
  const user = await getCurrentUser();
  return { user, allowed: user?.role === "ADMIN" };
}

/** Para server actions del admin: corta con error si no hay permisos. */
export async function assertAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("No autorizado: se requiere un usuario administrador.");
  return user;
}

/** Para páginas del admin: manda a ingresar o muestra acceso denegado. */
export async function requireAdminPage(next = "/admin"): Promise<SessionUser | null> {
  const { user, allowed } = await getAdminAccess();
  if (allowed) return user;
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return null;
}
