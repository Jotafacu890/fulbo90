import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminForm } from "@/components/admin/AdminForm";
import { PlayerFields } from "@/components/admin/PlayerFields";
import { Panel } from "@/components/admin/fields";
import { Flag } from "@/components/ui/Flag";
import { savePlayer } from "@/lib/actions/admin";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";
import { searchPlayers } from "@/lib/search/player-search";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminPlayers({ searchParams }: PageProps<"/admin/jugadores">) {
  if (!(await getAdminAccess()).allowed) notFound();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const index = await getFootballIndex();
  const players = query ? searchPlayers(index.players, query, 50) : [...index.players].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <Panel title={`Jugadores (${index.players.length})`}>
        <form className="mb-4">
          <input name="q" defaultValue={query} placeholder="Buscar…" className="h-10 w-full rounded-lg border border-line-strong bg-night px-3 text-sm" />
        </form>
        <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {players.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/jugadores/${p.id}`} className="flex items-center gap-3 px-2 py-2 text-sm hover:bg-pitch">
                <Flag code={p.nationality} />
                <span className="flex-1 font-semibold">{p.fullName}</span>
                <span className="text-xs text-mist">{index.seniorStints(p.id).length} clubes</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Nuevo jugador">
        <AdminForm action={savePlayer} submitLabel="Crear jugador" disabled={!isDatabaseConfigured()}>
          <PlayerFields />
        </AdminForm>
      </Panel>
    </div>
  );
}
