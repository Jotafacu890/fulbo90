import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/AdminForm";
import { Check, Field, Panel, Select } from "@/components/admin/fields";
import { addLineupPlayer } from "@/lib/actions/admin";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";
import { POSITION_LABELS } from "@/lib/game-engine/positions";
import { POSITIONS } from "@/types/football";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminMatch({ params }: PageProps<"/admin/partidos/[id]">) {
  if (!(await getAdminAccess()).allowed) notFound();
  const { id } = await params;
  const index = await getFootballIndex();
  const match = index.match(id);
  if (!match) notFound();
  const lineup = index.matchLineup(id);
  const sideName = (side: "home" | "away") => {
    const s = match[side];
    return s.clubId ? index.club(s.clubId)?.name : index.nationalTeam(s.nationalTeamId!)?.name;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {(["home", "away"] as const).map((side) => (
        <Panel key={side} title={`${sideName(side)} ${side === "home" ? match.homeScore : match.awayScore}`}>
          <ul className="space-y-1 text-sm">
            {lineup
              .filter((l) => l.side === side)
              .map((l) => (
                <li key={l.playerId} className="flex gap-3">
                  <span className="w-10 font-bold text-gold">{l.position}</span>
                  <span className="flex-1">{index.displayName(l.playerId)}</span>
                  <span className="text-mist">{l.starter ? "Titular" : "Suplente"}</span>
                  {l.goals > 0 && <span>⚽×{l.goals}</span>}
                </li>
              ))}
          </ul>
        </Panel>
      ))}
      <Panel title="Cargar jugador en la alineación" className="lg:col-span-2">
        <AdminForm action={addLineupPlayer} submitLabel="Agregar" disabled={!isDatabaseConfigured()}>
          <input type="hidden" name="matchId" value={id} />
          <Select label="Jugador" name="playerId" options={[...index.players].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((p) => ({ value: p.id, label: p.fullName }))} required placeholder="Elegí" />
          <Select label="Equipo" name="side" options={[{ value: "home", label: sideName("home") ?? "Local" }, { value: "away", label: sideName("away") ?? "Visitante" }]} />
          <Select label="Posición" name="position" options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))} />
          <Field label="Goles" name="goals" type="number" defaultValue={0} />
          <Check label="Titular" name="starter" defaultChecked />
        </AdminForm>
      </Panel>
    </div>
  );
}
