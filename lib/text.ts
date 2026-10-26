/** "Julián Álvarez" -> "julian alvarez". Base de la búsqueda y del campo normalizedName. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´.]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/ñ/g, "n").replace(/\s+/g, "-");
}
