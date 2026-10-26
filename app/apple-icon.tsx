import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/config/brand";
import { loadDisplayFont } from "@/lib/config/og-font";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícono cuadrado para pantalla de inicio (iOS/Android). */
export default async function AppleIcon() {
  const { night, gold, grass } = BRAND.colors;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: night, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 89, height: 3, background: grass, opacity: 0.45 }} />
        <div style={{ position: "absolute", width: 100, height: 100, borderRadius: 999, border: `3px solid ${grass}`, opacity: 0.45 }} />
        <div style={{ display: "flex", alignItems: "flex-start", fontSize: 84, fontFamily: "Archivo Black", color: gold, letterSpacing: -4 }}>
          {BRAND.wordmark.accent}
          <span style={{ color: "#2FD07F", fontSize: 50, marginLeft: 2 }}>′</span>
        </div>
      </div>
    ),
    { ...size, fonts: await loadDisplayFont() },
  );
}
