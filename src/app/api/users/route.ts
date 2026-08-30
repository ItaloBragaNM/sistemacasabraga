import { NextResponse } from "next/server";
import { isUserRole } from "@/lib/auth/roles";
import { requireModule } from "@/lib/auth/server";
import { createUser, listPublicUsers } from "@/lib/auth/store.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("configuracoes");
  if (error) return error;
  const users = await listPublicUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { error } = await requireModule("configuracoes");
  if (error) return error;

  let body: { name?: string; username?: string; password?: string; role?: string };
  try {
    body = (await request.json()) as {
      name?: string;
      username?: string;
      password?: string;
      role?: string;
    };
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!body.role || !isUserRole(body.role)) {
    return NextResponse.json({ error: "Selecione um tipo de usuário." }, { status: 400 });
  }

  try {
    const user = await createUser({
      name: body.name ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
      role: body.role,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível cadastrar o usuário.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
