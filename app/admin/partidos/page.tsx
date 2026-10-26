import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, Panel, Select } from "@/components/admin/fields";
import { saveMatch } from "@/lib/actions/admin";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminMatches() {
  if (!(await getAdminAccess()).allowed) notFound();
  await connection();
  const index = await getFootballIndex();
  const teams = [
    ...index.nationalTeams.map((n) => ({ value: n.id, label: `Selección ${n.name}` })),
    ...[...index.clubs].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_26rem]">
      <Panel title="Partidos históricos">
        <ul className="divide-y divide-line">
          {index.matches.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/partidos/${m.id}`} className="flex items-center gap-3 px-2 py-2.5 text-sm hover:bg-pitch">
                <span className="flex-1 font-semibold">{m.title}</span>
                <span className="tabular text-mist">
                  {m.homeScore}-{m.awayScore}
                </span>
                <span className="text-xs text-mist">{index.matchLineup(m.id).length} jugadores</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Nuevo partido">
        <AdminForm action={saveMatch} disabled={!isDatabaseConfigured()}>
          <Field label="Título" name="title" required placeholder="River vs Boca — Final Libertadores 2018" className="sm:col-span-2" />
          <Field label="Fecha" name="date" type="date" required />
          <Select label="Competición" name="competitionId" options={index.competitions.map((c) => ({ value: c.id, label: c.name }))} required placeholder="Elegí" />
          <Field label="Instancia" name="stage" defaultValue="Final" />
          <Field label="Estadio" name="venue" />
          <Select label="Local" name="homeTeam" options={teams} required placeholder="Elegí" />
          <Select label="Visitante" name="awayTeam" options={teams} required placeholder="Elegí" />
          <Field label="Goles local" name="homeScore" type="number" required />
          <Field label="Goles visitante" name="awayScore" type="number" required />
          <Field label="Penales local" name="homePenalties" type="number" />
          <Field label="Penales visitante" name="awayPenalties" type="number" />
          <Field label="Formación local" name="homeFormation" placeholder="4-1-3-2" />
          <Field label="Formación visitante" name="awayFormation" />
        </AdminForm>
      </Panel>
    </div>
  );
}
