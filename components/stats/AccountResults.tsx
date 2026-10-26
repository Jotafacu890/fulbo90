import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserResults } from "@/lib/database/challenges";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getGame } from "@/lib/games/registry";
import { formatShortDate, formatTime } from "@/lib/utils";

/** Resultados guardados en Neon para el usuario autenticado (lee la cookie: va dentro de <Suspense>). */
export async function AccountResults() {
  if (!isDatabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="mt-8 rounded-xl border border-line bg-night/60 p-4 text-sm text-mist">
        Estás jugando como invitado: tus resultados se guardan sólo en este navegador.{" "}
        <Link href="/ingresar?next=/estadisticas" className="font-bold text-grass-bright hover:underline">
          Creá una cuenta
        </Link>{" "}
        para guardarlos en la nube.
      </p>
    );
  }
  const results = await listUserResults(user.id, 30);
  return (
    <section className="card mt-8 p-5">
      <h2 className="display text-3xl">Tu historial en la cuenta</h2>
      <p className="mb-4 text-sm text-mist">Guardado en {user.email}</p>
      {results.length === 0 ? (
        <p className="text-sm text-mist">Todavía no terminaste ningún desafío con la sesión iniciada.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 font-semibold">{getGame(r.gameId)?.name ?? r.gameId}</span>
              <span className="text-mist">{r.dailyDate ? formatShortDate(r.dailyDate.toISOString().slice(0, 10)) : "Infinito"}</span>
              <span className="tabular w-14 text-right font-bold">
                {r.score}/{r.maxScore}
              </span>
              <span className="tabular w-14 text-right text-mist">{r.timeMs ? formatTime(r.timeMs) : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
