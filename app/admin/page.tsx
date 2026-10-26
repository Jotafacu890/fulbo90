import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { StatTile } from "@/components/ui/primitives";
import { dataSourceKind, getFootballIndex } from "@/lib/database/source";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminHome() {
  if (!(await getAdminAccess()).allowed) notFound();
  await connection();
  const index = await getFootballIndex();
  const ds = index.dataset;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Jugadores" value={ds.players.length} />
        <StatTile label="Clubes" value={ds.clubs.length} />
        <StatTile label="Competiciones" value={ds.competitions.length} />
        <StatTile label="Pasos por clubes" value={ds.playerClubs.length} />
        <StatTile label="Títulos de jugadores" value={ds.playerAchievements.length} />
        <StatTile label="Partidos" value={ds.matches.length} />
        <StatTile label="Alineaciones" value={ds.lineups.length} />
        <StatTile label="Fuente" value={dataSourceKind() === "prisma" ? "Neon" : "Estática"} />
      </div>
      <div className="card p-5 text-sm leading-relaxed text-mist">
        <p className="mb-2 font-bold text-chalk">Flujo recomendado</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Cargá o corregí <Link className="text-grass-bright underline" href="/admin/jugadores">jugadores</Link> y sus pasos por clubes y títulos.
          </li>
          <li>Las respuestas de los juegos se calculan solas a partir de esas relaciones (motor de condiciones).</li>
          <li>
            En <Link className="text-grass-bright underline" href="/admin/desafios">desafíos</Link> generá o pegá un desafío, previsualizalo y asignalo a un día.
          </li>
          <li>Si un día no tiene desafío asignado, se usa el generado automáticamente con el seed de la fecha.</li>
        </ol>
      </div>
    </div>
  );
}
