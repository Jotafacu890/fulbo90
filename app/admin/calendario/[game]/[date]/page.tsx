import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, Panel, Select } from "@/components/admin/fields";
import { blockKey, regenerateDaily } from "@/lib/actions/calendar";
import { getAdminAccess } from "@/lib/auth/session";
import { getDailyDetail } from "@/lib/game-engine/daily/admin-service";
import { getGame, type GameSlug } from "@/lib/games/registry";
import { formatShortDate } from "@/lib/utils";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

const DIFF = { 1: "Fácil", 2: "Media", 3: "Difícil" } as Record<number, string>;

export default async function DailyDetailPage({ params }: PageProps<"/admin/calendario/[game]/[date]">) {
  if (!(await getAdminAccess()).allowed) notFound();
  const { game, date } = await params;
  const meta = getGame(game);
  if (!meta) notFound();
  const detail = await getDailyDetail(game as GameSlug, date);
  if (!detail) notFound();
  const { entry, published } = detail;

  return (
    <div className="space-y-5">
      <Link href="/admin/calendario" className="text-sm font-semibold text-mist hover:text-chalk">
        ← Calendario
      </Link>
      <Panel title={`${meta.name} #${entry.number} · ${formatShortDate(date)}`}>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Dificultad guardada: <b>{DIFF[entry.difficulty]}</b>
            {detail.currentDifficulty && detail.currentDifficulty !== entry.difficulty && <span className="text-gold"> (con los datos actuales: {DIFF[detail.currentDifficulty]})</span>}
          </span>
          <span>Origen: <b>{entry.source}</b></span>
          <span>Estado: <b>{published ? (entry.firstServedAt ? "Publicado y jugado" : "Publicado") : "Programado"}</b></span>
          <span className="text-mist">Seed: {entry.challenge.seed}</span>
          <Link href={`/juegos/${game}?desafio=${entry.challengeId}`} target="_blank" className="font-bold text-grass-bright hover:underline">
            Previsualizar →
          </Link>
        </div>
        {detail.problems.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {detail.problems.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-grass-bright">✔ Revalidado contra los datos actuales: sin problemas.</p>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Consignas y respuestas verificadas">
          {detail.conditions.length ? (
            <ul className="space-y-1.5 text-sm">
              {detail.conditions.map((c) => (
                <li key={c.key} className="flex gap-3">
                  <span className="w-16 text-xs text-mist">{c.key}</span>
                  <span className="flex-1">{c.label}</span>
                  {c.answers > 0 && <span className="tabular text-mist">{c.answers} resp.</span>}
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-mist">
            {detail.answerCounts.map((a) => (
              <li key={a.key} className="rounded border border-line px-2 py-0.5">
                {a.key}: {a.count}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={published ? "Override administrativo" : "Regenerar"}>
          <AdminForm action={regenerateDaily} submitLabel={published ? "Forzar cambio" : "Regenerar"}>
            <input type="hidden" name="game" value={game} />
            <input type="hidden" name="date" value={date} />
            <Select label="Dificultad" name="difficulty" options={[1, 2, 3].map((d) => ({ value: String(d), label: DIFF[d] }))} placeholder="Según configuración" />
            {published && (
              <>
                <Field label="Motivo (queda registrado)" name="overrideReason" required className="sm:col-span-2" />
                <Field label='Escribí "CAMBIAR" para confirmar' name="confirm" required />
              </>
            )}
          </AdminForm>
          {published && <p className="mt-3 text-xs text-gold">Este desafío ya se publicó y puede haber partidas en curso. Cambiarlo invalida esas partidas: usalo sólo ante un error grave.</p>}
        </Panel>
      </div>

      <Panel title="Bloquear contenido">
        <p className="mb-3 text-sm text-mist">Lo bloqueado no vuelve a aparecer y los diarios futuros que lo usan se regeneran automáticamente.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {detail.blockable.map((b) => (
            <li key={b.key} className="rounded-xl border border-line p-3">
              <p className="text-sm font-semibold">{b.label}</p>
              {b.blocked ? (
                <p className="text-xs text-danger">Bloqueado</p>
              ) : (
                <AdminForm action={blockKey} submitLabel="Bloquear" className="mt-2">
                  <input type="hidden" name="key" value={b.key} />
                  <input type="hidden" name="label" value={b.label} />
                  <input type="hidden" name="game" value={game} />
                  <Select label="Alcance" name="scope" options={[{ value: game, label: "Este juego" }, { value: "*", label: "Todos los juegos" }]} />
                  <Field label="Motivo" name="reason" placeholder="Dato dudoso, repetido…" />
                </AdminForm>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
