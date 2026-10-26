import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Chequeo optimista para /admin: sin cookie de sesión manda a ingresar.
 * La autorización real (rol ADMIN contra Neon) ocurre en el servidor: layout y server actions.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE) || !process.env.DATABASE_URL) return NextResponse.next();
  const url = new URL("/ingresar", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/admin/:path*",
};
