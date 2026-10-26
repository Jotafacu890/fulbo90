import { COUNTRIES } from "@/lib/countries";
import { POSITION_LABELS } from "@/lib/game-engine/positions";
import { POSITIONS, type PlayerRecord } from "@/types/football";
import { Check, Field, Select } from "./fields";

const countryOptions = Object.entries(COUNTRIES).map(([code, c]) => ({ value: code, label: `${c.name} (${code})` }));

export function PlayerFields({ player }: { player?: PlayerRecord }) {
  return (
    <>
      {player && <input type="hidden" name="id" value={player.id} />}
      <Field label="Nombre completo" name="fullName" required defaultValue={player?.fullName} />
      <Field label="Apodo / nombre corto" name="shortName" defaultValue={player?.shortName} placeholder="Dibu Martínez" />
      <Select label="Nacionalidad" name="nationality" options={countryOptions} defaultValue={player?.nationality ?? "AR"} />
      <Select label="Segunda nacionalidad" name="secondNationality" options={countryOptions} defaultValue={player?.secondNationality} placeholder="—" />
      <Field label="Nacimiento" name="birthDate" type="date" defaultValue={player?.birthDate} hint="Dejalo vacío si no está confirmado" />
      <Select label="Posición principal" name="primaryPosition" options={POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }))} defaultValue={player?.primaryPosition ?? "DC"} />
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-mist">Posiciones secundarias</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {POSITIONS.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="secondaryPositions" value={p} defaultChecked={player?.secondaryPositions.includes(p)} className="accent-[var(--color-grass)]" />
              {p}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Foto (URL)" name="imageUrl" defaultValue={player?.imageUrl} />
      <div className="flex items-end pb-2">
        <Check label="En actividad" name="active" defaultChecked={player?.active ?? true} />
      </div>
    </>
  );
}
