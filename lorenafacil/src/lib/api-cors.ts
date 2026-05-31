import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
  "https://lorenafacil.vercel.app",
]);

export function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://lorenafacil.vercel.app";

  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
  };
}

export function corsPreflight(request: NextRequest) {
  return new NextResponse(null, {
    headers: getCorsHeaders(request),
    status: 204,
  });
}

export function jsonWithCors(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit,
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...getCorsHeaders(request),
      ...(init?.headers ?? {}),
    },
  });
}
