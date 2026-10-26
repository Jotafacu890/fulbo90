import { getAdminAccess } from "@/lib/auth/session";
import { Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/AdminForm";
import { PlayerFields } from "@/components/admin/PlayerFields";
import { Check, Field, Panel, Select } from "@/components/admin/fields";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { addPlayerClub, addPlayerTitle, deletePlayerClub, deletePlayerTitle, savePlayer } from "@/lib/actions/admin";
import { getPrisma, isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminPlayer({ params }: PageProps<"/admin/jugadores/[id]">) {
  if (!(await getAdminAccess()).allowed) notFound();
  const { id } = await params;
  const index = await getFootballIndex();
  const player = index.player(id);
  if (!player) notFound();
  const db = isDatabaseConfigured();

  // Con base de datos necesitamos los ids de fila para poder borrar.
  const stints = db
    ? await getPrisma().playerClub.findMany({ where: { playerId: id }, orderBy: { fromYear: "asc" } })
    : index.stints(id).map((s, i) => ({ ...s, id: String(i) }));
  const titles = db
    ? await getPrisma().playerCompetitionAchievement.findMany({ where: { playerId: id }, orderBy: { season: "asc" } })
    : index.achievements(id).map((a, i) => ({ ...a, id: String(i) }));

  const clubOptions = [...index.clubs].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: `${c.name} (${c.country})` }));
  const teamOptions = [...index.nationalTeams.map((n) => ({ value: n.id, label: `Selección ${n.name}` })), ...clubOptions];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={player.fullName} className="lg:col-span-2">
        <AdminForm action={savePlayer} disabled={!db}>
          <PlayerFields player={player} />
        </AdminForm>
      </Panel>

      <Panel title="Trayectoria">
        <ul className="mb-4 space-y-1.5">
          {stints.map((s) => {
            const club = index.club(s.clubId);
            return (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <ClubBadge name={club?.name ?? s.clubId} colors={[club?.primaryColor ?? "#1FA463", club?.secondaryColor ?? "#fff"]} className="size-6" />
                <span className="flex-1">
                  {club?.name ?? s.clubId}{" "}
                  <span className="text-mist">
                    {s.fromYear ? `${s.fromYear}–${s.toYear == null ? "hoy" : s.toYear}` : "sin años"}
                    {s.isYouth ? " · inferiores" : s.isAcademy ? " · canterano" : ""}
                    {s.isLoan ? " · préstamo" : ""}
                  </span>
                </span>
                {db && (
                  <form action={deletePlayerClub}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="playerId" value={id} />
                    <button className="text-mist hover:text-danger" aria-label="Borrar paso">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        <AdminForm action={addPlayerClub} submitLabel="Agregar paso" disabled={!db}>
          <input type="hidden" name="playerId" value={id} />
          <Select label="Club" name="clubId" options={clubOptions} placeholder="Elegí un club" required className="sm:col-span-2" />
          <Field label="Desde" name="fromYear" type="number" />
          <Field label="Hasta" name="toYear" type="number" hint="Vacío = sigue en el club" />
          <Field label="Partidos" name="appearances" type="number" />
          <Field label="Goles" name="goals" type="number" />
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <Check label="Surgido del club" name="isAcademy" />
            <Check label="Sólo inferiores" name="isYouth" />
            <Check label="Préstamo" name="isLoan" />
          </div>
        </AdminForm>
      </Panel>

      <Panel title="Títulos y distinciones">
        <ul className="mb-4 space-y-1.5">
          {titles.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">
                {index.competition(t.competitionId)?.name} {t.season}{" "}
                <span className="text-mist">
                  · {t.clubId ? index.club(t.clubId)?.shortName : t.nationalTeamId} {t.result !== "WINNER" ? `· ${t.result}` : ""}
                </span>
              </span>
              {db && (
                <form action={deletePlayerTitle}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="playerId" value={id} />
                  <button className="text-mist hover:text-danger" aria-label="Borrar título">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <AdminForm action={addPlayerTitle} submitLabel="Agregar título" disabled={!db}>
          <input type="hidden" name="playerId" value={id} />
          <Select label="Competición" name="competitionId" options={index.competitions.map((c) => ({ value: c.id, label: c.name }))} required placeholder="Elegí" />
          <Field label="Temporada" name="season" type="number" required />
          <Select label="Con" name="team" options={teamOptions} placeholder="—" />
          <Select
            label="Resultado"
            name="result"
            options={[
              { value: "WINNER", label: "Campeón" },
              { value: "RUNNER_UP", label: "Subcampeón" },
              { value: "TOP_SCORER", label: "Goleador" },
              { value: "BEST_PLAYER", label: "Mejor jugador" },
            ]}
          />
        </AdminForm>
      </Panel>
    </div>
  );
}
