import { getAdminAccess } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, Panel, Select } from "@/components/admin/fields";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { Flag } from "@/components/ui/Flag";
import { saveClub } from "@/lib/actions/admin";
import { COUNTRIES } from "@/lib/countries";
import { isDatabaseConfigured } from "@/lib/database/prisma";
import { getFootballIndex } from "@/lib/database/source";

/** Panel interno: puede esperar a la base de datos al navegar. */
export const instant = false;

export default async function AdminClubs() {
  if (!(await getAdminAccess()).allowed) notFound();
  await connection();
  const index = await getFootballIndex();
  const clubs = [...index.clubs].sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <Panel title={`Clubes (${clubs.length})`}>
        <ul className="grid max-h-[70vh] gap-1 overflow-y-auto sm:grid-cols-2">
          {clubs.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-pitch">
              <ClubBadge name={c.name} colors={[c.primaryColor ?? "#1FA463", c.secondaryColor ?? "#fff"]} className="size-7" />
              <span className="flex-1 truncate font-semibold">{c.name}</span>
              <Flag code={c.country} />
              <span className="w-10 text-right text-xs text-mist">{index.playersOfClub(c.id).length}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Agregar / editar club">
        <AdminForm action={saveClub} disabled={!isDatabaseConfigured()}>
          <Field label="Id (slug)" name="id" placeholder="river" hint="Para editar, usá el id existente" />
          <Field label="Nombre" name="name" required />
          <Field label="Nombre corto" name="shortName" />
          <Select label="País" name="country" options={Object.entries(COUNTRIES).map(([v, c]) => ({ value: v, label: c.name }))} defaultValue="AR" />
          <Field label="Ciudad" name="city" />
          <Field label="Fundación" name="foundedYear" type="number" />
          <Field label="Apodo" name="nickname" />
          <Field label="Estadio" name="stadium" />
          <Field label="Color principal" name="primaryColor" type="color" defaultValue="#1FA463" />
          <Field label="Color secundario" name="secondaryColor" type="color" defaultValue="#FFFFFF" />
          <Select label="Jerarquía" name="tier" options={[{ value: "1", label: "1 · Grande continental" }, { value: "2", label: "2 · Importante" }, { value: "3", label: "3 · Resto" }]} defaultValue="3" />
          <Field label="Logo (URL con derechos)" name="logoUrl" />
        </AdminForm>
      </Panel>
    </div>
  );
}
