import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default: `${BRAND.name} — ${BRAND.description}`,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.tagline} ${BRAND.description}`,
  applicationName: BRAND.name,
  keywords: ["fútbol argentino", "trivia", "juego diario", "Libertadores", "River", "Boca", "Selección Argentina", "fútbol sudamericano"],
  openGraph: {
    type: "website",
    locale: BRAND.locale,
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.description, images: ["/api/og"] },
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.night,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${archivo.variable} h-full antialiased`}>
      <body className="floodlights flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
