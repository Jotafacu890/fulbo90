import type { Metadata } from "next";
import { BRAND } from "@/lib/config/brand";
import { getGame } from "./registry";

/** Metadata + Open Graph por juego (la imagen se genera en /api/og). */
export function gameMetadata(slug: string): Metadata {
  const game = getGame(slug);
  if (!game) return {};
  const title = game.name;
  const description = `${game.tagline} ${BRAND.description}`;
  const image = `/api/og?juego=${game.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/juegos/${game.slug}` },
    openGraph: { title: `${game.name} · ${BRAND.name}`, description, url: `/juegos/${game.slug}`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `${game.name} · ${BRAND.name}`, description, images: [image] },
  };
}
