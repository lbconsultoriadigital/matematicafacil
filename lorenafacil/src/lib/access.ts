export const ACCESS_COOKIE_NAME = "lorena_access";
export const DEFAULT_ACCESS_PIN = "2505";

export function getConfiguredAccessPin() {
  return (process.env.LORENA_ACCESS_PIN || DEFAULT_ACCESS_PIN).trim();
}

export function isNumericPin(value: unknown): value is string {
  return typeof value === "string" && /^\d{4,8}$/.test(value);
}

export async function createAccessToken(pin = getConfiguredAccessPin()) {
  const secret = process.env.ACCESS_COOKIE_SECRET || getConfiguredAccessPin();
  const data = new TextEncoder().encode(`lorena-facil:${pin}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAccessTokenValid(token?: string) {
  if (!token) return false;
  return token === (await createAccessToken());
}
