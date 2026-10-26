import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForms } from "@/components/auth/AuthForms";
import { Skeleton } from "@/components/ui/primitives";
import { BRAND } from "@/lib/config/brand";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="display text-5xl">Entrá a la cancha</h1>
      <p className="mt-2 text-sm text-mist">
        Con una cuenta tus resultados y rachas quedan guardados en {BRAND.name} y no los perdés al cambiar de dispositivo. Sin cuenta podés jugar igual: se guardan en este navegador.
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-80 w-full" />}>
        <AuthForms />
      </Suspense>
    </div>
  );
}
