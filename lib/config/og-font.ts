import { readFile } from "node:fs/promises";
import { join } from "node:path";

let cached: Promise<Buffer> | null = null;

/** Archivo Black para las imágenes generadas (OG, ícono de app): el logotipo tiene que verse grueso. */
export function loadDisplayFont() {
  cached ??= readFile(join(process.cwd(), "node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff"));
  return cached.then((data) => [{ name: "Archivo Black", data, weight: 900 as const, style: "normal" as const }]);
}
