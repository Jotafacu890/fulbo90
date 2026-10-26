import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, Panel, Select } from "@/components/admin/fields";
import { runEngineNow, unblock, updateSettings } from "@/lib/actions/calendar";
import { getAdminAccess } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getAllSettings, getBlockedList, getCalendar, getRecentLogs, getReserveCounts } from "@/lib/game-engine/daily/admin-service";
import { DAILY_GAMES } from "@/lib/games/registry";
import { cn, formatShortDate } from "@/lib/utils";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

const DIFF = { 1: "Fácil", 2: "Media", 3: "Difícil" } as Record<number, string>;
const diffOptions = [1, 2, 3].map((d) => ({ value: String(d), label: `${d} · ${DIFF[d]}` }));

export default async function CalendarPage() {
  if (!(await getAdminAccess()).allowed) notFound();
  await connection();
  if (!isDatabaseConfigured()) return <p className="card p-6 text-sm text-mist">El calendario automático requiere Neon (DATABASE_URL).</p>;

  const [{ dates, cells }, settings, logs, blocked, reserves] = await Promise.all([getCalendar(30), getAllSettings(), getRecentLogs(40), getBlockedList(), getReserveCounts()]);
  const missing = Object.values(cells).filter((c) => !c.challengeId).length;
  const incidents = logs.filter((l) => l.level !== "INFO");

  return (
    <div className="space-y-5">
      <Panel title="Calendario de desafíos · próximos 30 días">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className={cn("rounded-full px-3 py-1 font-bold", missing ? "bg-danger/15 text-danger" : "bg-grass/15 text-grass-bright")}>
            {missing ? `${missing} huecos en el calendario` : "Calendario completo"}
          </span>
          {DAILY_GAMES.map((g) => (
            <span key={g.slug} className="text-mist">
              Reservas {g.name}: <b className="text-chalk">{reserves[g.slug] ?? 0}</b>
            </span>
          ))}
          <AdminForm action={runEngineNow} submitLabel="Ejecutar motor ahora" className="ml-auto">
            <span />
          </AdminForm>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-mist">
                <th className="py-2">Fecha</th>
                {DAILY_GAMES.map((g) => (
                  <th key={g.slug}>{g.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {dates.map((date) => (
                <tr key={date}>
                  <td className="py-1.5 font-semibold tabular">{formatShortDate(date)}</td>
                  {DAILY_GAMES.map((g) => {
                    const c = cells[`${g.slug}|${date}`];
                    return (
                      <td key={g.slug} className="py-1.5">
                        {c.challengeId ? (
                          <Link href={`/admin/calendario/${g.slug}/${date}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 hover:border-grass">
                            <span className="tabular font-bold">#{c.number}</span>
                            <span className={cn("text-xs", c.difficulty === 3 ? "text-danger" : c.difficulty === 2 ? "text-gold" : "text-grass-bright")}>{DIFF[c.difficulty ?? 2]}</span>
                            {c.source !== "GENERATED" && <span className="text-[10px] uppercase text-sky">{c.source === "RESERVE" ? "reserva" : "manual"}</span>}
                            {c.published && <span className="text-[10px] uppercase text-mist">{c.served ? "jugado" : "publicado"}</span>}
                          </Link>
                        ) : (
                          <span className="text-xs font-bold text-danger">Falta</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Configuración por juego">
          <div className="space-y-5">
            {DAILY_GAMES.map((g) => {
              const s = settings[g.slug];
              return (
                <AdminForm key={g.slug} action={updateSettings} submitLabel={`Guardar ${g.name}`}>
                  <input type="hidden" name="game" value={g.slug} />
                  <p className="text-sm font-bold sm:col-span-2">{g.name}</p>
                  <Field label="Sin repetir el desafío (días)" name="repeatWindowDays" type="number" defaultValue={s.repeatWindowDays} min={0} max={365} />
                  <Field label="Sin repetir contenido parcial (días)" name="softRepeatDays" type="number" defaultValue={s.softRepeatDays} min={0} max={120} />
                  <Field label="Días precargados" name="horizonDays" type="number" defaultValue={s.horizonDays} min={1} max={90} />
                  <Select label="Dificultad mínima" name="minDifficulty" options={diffOptions} defaultValue={String(s.minDifficulty)} />
                  <Select label="Dificultad máxima" name="maxDifficulty" options={diffOptions} defaultValue={String(s.maxDifficulty)} />
                  <Select label="Dificultad preferida" name="targetDifficulty" options={diffOptions} defaultValue={String(s.targetDifficulty)} />
                  <Field label="Reservas a mantener" name="reserveSize" type="number" defaultValue={s.reserveSize} min={0} max={30} />
                </AdminForm>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title={`Incidentes y errores (${incidents.length})`}>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {incidents.length === 0 && <li className="text-mist">Sin incidentes recientes.</li>}
              {incidents.map((l) => (
                <li key={l.id} className="rounded-lg border border-line p-2">
                  <span className={cn("mr-2 text-xs font-bold", l.level === "ERROR" ? "text-danger" : "text-gold")}>{l.level}</span>
                  <span className="text-xs text-mist">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {l.event}</span>
                  <p>{l.message}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Últimas ejecuciones">
            <ul className="max-h-60 space-y-1 overflow-y-auto text-xs text-mist">
              {logs
                .filter((l) => l.event === "cron-run")
                .map((l) => (
                  <li key={l.id}>
                    {l.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {l.message}
                  </li>
                ))}
            </ul>
          </Panel>

          <Panel title={`Contenido bloqueado (${blocked.length})`}>
            <ul className="space-y-1 text-sm">
              {blocked.length === 0 && <li className="text-mist">Nada bloqueado. Se bloquea desde el detalle de cada desafío.</li>}
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-2">
                  <span className="flex-1">
                    {b.label ?? b.key} <span className="text-xs text-mist">· {b.gameId === "*" ? "todos los juegos" : b.gameId}{b.reason ? ` · ${b.reason}` : ""}</span>
                  </span>
                  <form action={unblock}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-xs font-bold text-grass-bright hover:underline">Desbloquear</button>
                  </form>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
