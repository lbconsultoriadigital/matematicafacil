import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  getConfiguredAccessPin,
  isNumericPin,
} from "@/lib/access";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { pin?: unknown };
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (!isNumericPin(pin)) {
    return NextResponse.json({ ok: false, message: "Digite apenas números." }, { status: 400 });
  }

  if (pin !== getConfiguredAccessPin()) {
    return NextResponse.json({ ok: false, message: "Senha incorreta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: await createAccessToken(pin),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}
