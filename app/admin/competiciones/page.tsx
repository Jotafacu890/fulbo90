import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, Panel, Select } from "@/components/admin/fields";
import { saveCompetition } from "@/lib/actions/admin";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";

const TYPES = [
  { value: "CLUB_INTERNATIONAL", label: "Internacional de clubes" },
  { value: "CLUB_LEAGUE", label: "Liga" },
  { value: "CLUB_CUP", label: "Copa nacional" },
  { value: "NATIONAL_TEAM", label: "Selecciones" },
];

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminCompetitions() {
  if (!(await getAdminAccess()).allowed) notFound();
  await connection();
  const index = await getFootballIndex();
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <Panel title="Competiciones">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {index.competitions.map((c) => (
              <tr key={c.id}>
                <td className="py-2 font-semibold">{c.name}</td>
                <td className="text-mist">{c.region}</td>
                <td className="text-mist">{TYPES.find((t) => t.value === c.type)?.label}</td>
                <td className="text-right text-xs text-mist">{index.dataset.playerAchievements.filter((a) => a.competitionId === c.id).length} títulos</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Nueva competición">
        <AdminForm action={saveCompetition} disabled={!isDatabaseConfigured()}>
          <Field label="Id (slug)" name="id" placeholder="recopa" />
          <Field label="Nombre" name="name" required />
          <Field label="Nombre corto" name="shortName" />
          <Field label="Región" name="region" defaultValue="CONMEBOL" />
          <Field label="País (si es local)" name="country" placeholder="AR" />
          <Select label="Tipo" name="type" options={TYPES} />
        </AdminForm>
      </Panel>
    </div>
  );
}
