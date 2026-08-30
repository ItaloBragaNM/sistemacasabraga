import type { SessionPayload, UserRole } from "./types";
import { isUserRole } from "./roles";

export const SESSION_COOKIE = "cb_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sessionSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "casabraga-dev-session-secret"
  );
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signBytes(data: Uint8Array) {
  const key = await hmacKey();
  const copy = Uint8Array.from(data);
  const signature = await crypto.subtle.sign("HMAC", key, copy as BufferSource);
  return toBase64Url(new Uint8Array(signature));
}

async function verifyBytes(data: Uint8Array, signature: string) {
  const key = await hmacKey();
  const copy = Uint8Array.from(data);
  const sig = Uint8Array.from(fromBase64Url(signature));
  return crypto.subtle.verify("HMAC", key, sig as BufferSource, copy as BufferSource);
}

export async function createSessionToken(input: {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: input.id,
    username: input.username,
    name: input.name,
    role: input.role,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signBytes(new TextEncoder().encode(body));
  return `${body}.${signature}`;
}

export async function readSessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const ok = await verifyBytes(new TextEncoder().encode(body), signature);
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!payload.sub || !payload.username || !isUserRole(payload.role)) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
