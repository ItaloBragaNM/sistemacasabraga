import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { applyReceivableHistory } from "@/lib/financeiro/changelog";
import { readContasAReceber, readContasAReceberState, saveContasAReceber } from "@/lib/financeiro/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { ContasAReceberData } from "@/lib/financeiro/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("financeiro");
  if (error) return error;
  try {
    const { data, updatedAt } = await readContasAReceberState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler contas a receber", error);
    return NextResponse.json({ error: "Não foi possível carregar as contas a receber." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("financeiro");
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  let parsed: { body: unknown; updatedAt: string | null };
  try {
    parsed = await parseStatePut(request);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readContasAReceber();
    const payload = parsed.body as ContasAReceberData;
    const stamped = applyReceivableHistory(previous.receivables, payload.receivables ?? [], {
      id: user.id,
      name: user.name,
    });
    const saved = await saveContasAReceber({ receivables: stamped }, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    return jsonState(saved.data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar contas a receber", error);
    return NextResponse.json({ error: "Não foi possível salvar as contas a receber." }, { status: 500 });
  }
}
