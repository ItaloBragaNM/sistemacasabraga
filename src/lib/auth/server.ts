import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { canAccessModule } from "./roles";
import {
  readSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "./session";
import { findUserById, toPublicUser } from "./store.server";
import type { PublicUser } from "./types";

export async function getSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const payload = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await findUserById(payload.sub);
  if (!user) return null;
  return toPublicUser(user);
}

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null as PublicUser | null,
      error: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }),
    };
  }
  return { user, error: null };
}

export async function requireModule(moduleId: string) {
  const { user, error } = await requireSession();
  if (error || !user) return { user: null as PublicUser | null, error };
  if (!canAccessModule(user.role, moduleId)) {
    return {
      user: null as PublicUser | null,
      error: NextResponse.json(
        { error: "Você não tem acesso a este módulo." },
        { status: 403 },
      ),
    };
  }
  return { user, error: null };
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
