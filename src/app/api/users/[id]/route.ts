import { NextResponse } from "next/server";
import { isUserRole } from "@/lib/auth/roles";
import { requireModule } from "@/lib/auth/server";
import { deleteUser, updateUser } from "@/lib/auth/store.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, error } = await requireModule("configuracoes");
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }
  const { id } = await params;

  let body: { name?: string; role?: string; password?: string };
  try {
    body = (await request.json()) as { name?: string; role?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (body.role && !isUserRole(body.role)) {
    return NextResponse.json({ error: "Tipo de usuário inválido." }, { status: 400 });
  }

  try {
    const updated = await updateUser(id, {
      name: body.name,
      role: body.role && isUserRole(body.role) ? body.role : undefined,
      password: body.password?.trim() ? body.password : undefined,
    });
    return NextResponse.json({ user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível atualizar o usuário.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, error } = await requireModule("configuracoes");
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }
  const { id } = await params;

  try {
    await deleteUser(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível excluir o usuário.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
