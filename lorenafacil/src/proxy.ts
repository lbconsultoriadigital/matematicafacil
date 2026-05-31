import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, isAccessTokenValid } from "@/lib/access";

const PUBLIC_PATHS = [
  "/acesso",
  "/api/access",
  "/favicon.ico",
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/stickers/")
  );
}

function isCapacitorOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === "capacitor://localhost" || origin === "https://localhost";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if ((pathname === "/api/tutor" || pathname === "/api/reward") && isCapacitorOrigin(request)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (await isAccessTokenValid(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, message: "Acesso bloqueado." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/acesso";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
