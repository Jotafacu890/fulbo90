import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, Panel, Select, TextArea } from "@/components/admin/fields";
import { createChallenge } from "@/lib/actions/admin";
import { publishChallenge } from "@/lib/actions/calendar";
import { getPrisma, isDatabaseConfigured } from "@/lib/database/prisma";
import { addDays, argentinaDate } from "@/lib/game-engine/daily";
import { ENGINES } from "@/lib/game-engine/games";
import { ELEVEN_VARIANTS } from "@/lib/game-engine/games/starting-eleven";
import { getGame } from "@/lib/games/registry";
import { formatShortDate } from "@/lib/utils";

const EXAMPLE = `{
  "rows": [
    { "PLAYED_FOR_COUNTRY": "Argentina" },
    { "WON_COMPETITION": "Copa Libertadores" },
    { "PLAYED_IN_COUNTRY": "EUROPE", "label": "Jugó en Europa" }
  ],
  "cols": [
    { "PLAYED_FOR_CLUB": "River Plate" },
    { "PLAYED_FOR_CLUB": "Boca Juniors" },
    { "PLAYED_FOR_CLUB": "Racing Club" }
  ]
}`;

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminChallenges() {
  if (!(await getAdminAccess()).allowed) notFound();
  await connection();
  const db = isDatabaseConfigured();
  const today = argentinaDate();
  const games = Object.keys(ENGINES).map((slug) => ({ value: slug, label: getGame(slug)!.name }));
  const [challenges, dailies] = db
    ? await Promise.all([
        getPrisma().challenge.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
        getPrisma().dailyChallenge.findMany({ where: { date: { gte: new Date(`${addDays(today, -3)}T00:00:00Z`) } }, orderBy: { date: "asc" } }),
      ])
    : [[], []];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Crear desafío">
        <AdminForm action={createChallenge} submitLabel="Crear" disabled={!db}>
          <Select label="Juego" name="gameId" options={games} />
          <Field label="Título interno" name="title" placeholder="Grid clásicos argentinos" />
          <Field label="Seed (para generar)" name="seed" placeholder="mi-seed" hint="Si no pegás JSON, se genera con este seed" />
          <Select label="Variante (El 11)" name="variant" options={Object.entries(ELEVEN_VARIANTS).map(([v, x]) => ({ value: v, label: x.name }))} placeholder="Automática" />
          <TextArea label="Payload JSON (opcional)" name="payload" placeholder={EXAMPLE} rows={12} />
        </AdminForm>
        <p className="mt-3 text-xs text-mist">
          Las condiciones aceptan la forma abreviada (<code>{`{ "PLAYED_FOR_CLUB": "River Plate" }`}</code>) y se combinan con AND / OR / NOT. Al guardar se valida contra los
          datos: si una celda no tiene respuestas posibles, se rechaza.
        </p>
      </Panel>

      <Panel title="Publicar manualmente">
        <AdminForm action={publishChallenge} submitLabel="Publicar en esa fecha" disabled={!db}>
          <Select label="Desafío" name="challengeId" options={challenges.map((c) => ({ value: c.id, label: `${getGame(c.gameId)?.name} · ${c.title ?? c.id}` }))} placeholder="Elegí" required />
          <Field label="Fecha" name="date" type="date" defaultValue={addDays(today, 1)} required />
        </AdminForm>
        <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-mist">Programados</h3>
        <ul className="space-y-1 text-sm">
          {dailies.length === 0 && <li className="text-mist">Sin asignaciones: se usan los desafíos generados por seed.</li>}
          {dailies.map((d) => (
            <li key={d.id}>
              {formatShortDate(d.date.toISOString().slice(0, 10))} · {getGame(d.gameId)?.name} #{d.number}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Desafíos guardados" className="lg:col-span-2">
        {!db && <p className="text-sm text-mist">Sin base de datos no hay desafíos guardados: los diarios se generan con el seed de cada fecha.</p>}
        <ul className="divide-y divide-line text-sm">
          {challenges.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2">
              <span className="flex-1">
                <b>{getGame(c.gameId)?.name}</b> · {c.title ?? "Sin título"} <span className="text-xs text-mist">{c.id}</span>
              </span>
              <Link href={`/juegos/${c.gameId}?desafio=${c.id}`} className="font-bold text-grass-bright hover:underline" target="_blank">
                Previsualizar
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
