import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { countUsers, createUser } from "@/lib/auth/store.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if ((await countUsers()) > 0) {
    return NextResponse.json(
      { error: "O primeiro acesso já foi criado. Faça login." },
      { status: 409 },
    );
  }

  let body: { name?: string; username?: string; password?: string };
  try {
    body = (await request.json()) as { name?: string; username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Informe nome, usuário e senha." }, { status: 400 });
  }

  try {
    const user = await createUser({
      name: body.name ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
      role: "gestao",
    });
    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o acesso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
