import "server-only";
import { buildStaticDataset } from "@/data";
import { FootballIndex } from "@/lib/game-engine/dataset/football-index";
import { isDatabaseConfigured } from "./prisma";

/**
 * Punto único de acceso a los datos futbolísticos.
 *  - "static": usa los archivos de /data (sin base de datos; ideal para desarrollo y demos).
 *  - "prisma": lee PostgreSQL (Neon). Es la fuente de verdad en producción y la que edita /admin.
 */
export type DataSourceKind = "static" | "prisma";

export function dataSourceKind(): DataSourceKind {
  const forced = process.env.DATA_SOURCE;
  if (forced === "static" || forced === "prisma") return forced;
  return isDatabaseConfigured() ? "prisma" : "static";
}

const TTL_MS = 5 * 60_000;
let cached: { index: Promise<FootballIndex>; at: number; kind: DataSourceKind } | null = null;

async function load(kind: DataSourceKind): Promise<FootballIndex> {
  if (kind === "prisma") {
    const { loadDatasetFromDatabase } = await import("./prisma-dataset");
    return new FootballIndex(await loadDatasetFromDatabase());
  }
  return new FootballIndex(buildStaticDataset());
}

/** Índice en memoria cacheado por proceso. Con Prisma se refresca cada 5 minutos o al editar en /admin. */
export function getFootballIndex(): Promise<FootballIndex> {
  const kind = dataSourceKind();
  const fresh = cached && cached.kind === kind && (kind === "static" || Date.now() - cached.at < TTL_MS);
  if (!fresh) {
    const index = load(kind);
    cached = { index, at: Date.now(), kind };
    index.catch(() => {
      cached = null;
    });
  }
  return cached!.index;
}

export function invalidateFootballIndex() {
  cached = null;
}
