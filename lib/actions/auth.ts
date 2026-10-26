"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getPrisma, isDatabaseConfigured } from "@/lib/database/prisma";

export interface AuthState {
  error?: string;
}

const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "/";
  // Sólo rutas internas: evita redirecciones abiertas a otros dominios.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresá un email válido").max(120),
  displayName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(30, "Máximo 30 caracteres"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

/** Emails que reciben rol ADMIN al registrarse (ADMIN_EMAILS="a@b.com,c@d.com"). */
const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isDatabaseConfigured()) return { error: "Las cuentas requieren base de datos (DATABASE_URL)." };
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, displayName, password } = parsed.data;
  const db = getPrisma();
  if (await db.user.findUnique({ where: { email } })) return { error: "Ya existe una cuenta con ese email." };
  const user = await db.user.create({
    data: { email, displayName, passwordHash: await hashPassword(password), role: adminEmails().includes(email) ? "ADMIN" : "USER" },
  });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isDatabaseConfigured()) return { error: "Las cuentas requieren base de datos (DATABASE_URL)." };
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await getPrisma().user.findUnique({ where: { email: parsed.data.email } });
  // Mismo mensaje para email inexistente y contraseña incorrecta (no revela qué cuentas existen).
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return { error: "Email o contraseña incorrectos." };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
