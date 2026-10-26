import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND } from "@/lib/config/brand";
import { getGame } from "@/lib/games/registry";
import { loadDisplayFont } from "@/lib/config/og-font";

/**
 * Imagen Open Graph: /api/og?juego=grid&resultado=8/9&detalle=Rareza%20184
 * Sirve tanto para la página de cada juego como para compartir un resultado.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const game = getGame(sp.get("juego") ?? "");
  const result = sp.get("resultado")?.slice(0, 12);
  const detail = sp.get("detalle")?.slice(0, 40);
  const { night, pitch, gold, chalk, mist, grass } = BRAND.colors;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `radial-gradient(900px 420px at 15% -10%, ${grass}44, transparent), radial-gradient(800px 400px at 95% -10%, ${gold}22, transparent), ${night}`,
          color: chalk,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", fontSize: 64, fontFamily: "Archivo Black", letterSpacing: -2 }}>
            {BRAND.wordmark.base}
            <span style={{ color: gold }}>{BRAND.wordmark.accent}</span>
            <span style={{ color: grass, fontSize: 36 }}>′</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontFamily: "Archivo Black", lineHeight: 1, textTransform: "uppercase", letterSpacing: -3 }}>{game?.name ?? "Desafíos diarios"}</div>
          <div style={{ fontSize: 34, color: mist, marginTop: 18 }}>{game?.tagline ?? BRAND.description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: chalk }}>{BRAND.tagline}</span>
            <span style={{ fontSize: 24, color: mist, marginTop: 6 }}>{BRAND.secondaryTagline}</span>
          </div>
          {result && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, background: pitch, padding: "14px 28px", borderRadius: 20, border: `2px solid ${gold}` }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: gold }}>{result}</span>
              {detail && <span style={{ fontSize: 26, color: chalk }}>{detail}</span>}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await loadDisplayFont() },
  );
}
