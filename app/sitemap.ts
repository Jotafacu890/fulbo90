import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config/brand";
import { GAMES } from "@/lib/games/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BRAND.url, changeFrequency: "daily", priority: 1 },
    ...GAMES.map((g) => ({ url: `${BRAND.url}/juegos/${g.slug}`, changeFrequency: "daily" as const, priority: g.status === "available" ? 0.9 : 0.4 })),
  ];
}
