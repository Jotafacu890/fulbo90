"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminActionState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Action = (state: AdminActionState, form: FormData) => Promise<AdminActionState>;

/** Formulario del admin con estado de envío y mensajes de error/éxito. */
export function AdminForm({ action, submitLabel = "Guardar", children, className, disabled }: { action: Action; submitLabel?: string; children: ReactNode; className?: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={cn("space-y-3", className)}>
      <fieldset disabled={disabled || pending} className="grid gap-3 sm:grid-cols-2">
        {children}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={disabled || pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {state.error && <span className="text-sm font-semibold text-danger">{state.error}</span>}
        {state.ok && <span className="text-sm font-semibold text-grass-bright">{state.message}</span>}
      </div>
    </form>
  );
}
