/**
 * Branding centralizado. Para renombrar el producto alcanza con cambiar este archivo
 * (el logotipo de components/brand/Logo.tsx se arma a partir de `wordmark`).
 */
export const BRAND = {
  name: "FULBO90",
  /** El logotipo resalta `accent` (los 90 minutos) dentro del nombre. */
  wordmark: { base: "FULBO", accent: "90" },
  tagline: "¿Cuánto sabés de fulbo?",
  secondaryTagline: "90 minutos no alcanzan para todo lo que sabés.",
  description: "Demostrá que sos el que más sabe de fútbol argentino y sudamericano.",
  shareEmoji: "⚽",
  hashtag: "#FULBO90",
  /** Dominio candidato (no confirmado): se define con NEXT_PUBLIC_SITE_URL, p. ej. https://fulbo90.com */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es_AR",
  colors: {
    night: "#07130D",
    pitch: "#0E291B",
    grass: "#1FA463",
    chalk: "#F5F7F5",
    gold: "#E7B94B",
    mist: "#A6AEA9",
  },
  /** Prefijo de las claves de localStorage. Cambiarlo resetea el progreso guardado de los usuarios. */
  storagePrefix: "fulbo90",
} as const;
