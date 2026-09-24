import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { markNotificationsRead, readNotificacoes } from "@/lib/notificacoes/store.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  try {
    const data = await readNotificacoes();
    return NextResponse.json({ data: data.items });
  } catch (error) {
    console.error("Falha ao ler as notificações", error);
    return NextResponse.json({ error: "Não foi possível carregar as notificações." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  }
  let payload: { ids?: unknown; readAll?: unknown } = {};
  try {
    payload = (await request.json()) as { ids?: unknown; readAll?: unknown };
  } catch {
    payload = {};
  }
  try {
    const ids = Array.isArray(payload.ids)
      ? payload.ids.filter((id): id is string => typeof id === "string" && Boolean(id))
      : undefined;
    const data = await markNotificationsRead(user.id, payload.readAll ? undefined : ids);
    return NextResponse.json({ data: data.items });
  } catch (error) {
    console.error("Falha ao marcar notificações", error);
    return NextResponse.json({ error: "Não foi possível atualizar as notificações." }, { status: 500 });
  }
}
