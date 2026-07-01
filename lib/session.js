const COOKIE_NAME = "wa_session";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

async function sign(payload) {
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionCookie() {
  const expires = Date.now() + MAX_AGE_MS;
  const payload = `admin.${expires}`;
  const sig = await sign(payload);
  const value = `${payload}.${sig}`;
  return {
    name: COOKIE_NAME,
    value,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_MS / 1000,
    },
  };
}

export async function verifySessionCookie(value) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [role, expires, sig] = parts;
  const payload = `${role}.${expires}`;
  const expected = await sign(payload);
  if (expected !== sig) return false;
  if (Date.now() > Number(expires)) return false;
  return true;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
