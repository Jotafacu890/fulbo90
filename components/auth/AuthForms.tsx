"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Field } from "@/components/admin/fields";
import { Button } from "@/components/ui/Button";
import { login, register, type AuthState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function AuthForms() {
  const next = useSearchParams().get("next") ?? "/";
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginState, loginAction, loggingIn] = useActionState<AuthState, FormData>(login, {});
  const [registerState, registerAction, registering] = useActionState<AuthState, FormData>(register, {});

  return (
    <div className="card mt-6 p-5">
      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-night/60 p-1">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("flex-1 rounded-lg py-2 text-sm font-bold", tab === t ? "bg-pitch-2 text-chalk" : "text-mist hover:text-chalk")}
          >
            {t === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <form action={loginAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
          {loginState.error && <p className="text-sm font-semibold text-danger">{loginState.error}</p>}
          <Button type="submit" className="w-full" disabled={loggingIn}>
            {loggingIn ? "Entrando…" : "Ingresar"}
          </Button>
        </form>
      ) : (
        <form action={registerAction} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <Field label="Nombre o apodo" name="displayName" autoComplete="nickname" required maxLength={30} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Mínimo 8 caracteres" />
          {registerState.error && <p className="text-sm font-semibold text-danger">{registerState.error}</p>}
          <Button type="submit" variant="gold" className="w-full" disabled={registering}>
            {registering ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
      )}
    </div>
  );
}
