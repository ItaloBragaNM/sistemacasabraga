import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { applyReceivableHistory } from "@/lib/financeiro/changelog";
import { readContasAReceber, writeContasAReceber } from "@/lib/financeiro/store.server";
import type { ContasAReceberData } from "@/lib/financeiro/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("financeiro");
  if (error) return error;
  try {
    const data = await readContasAReceber();
    return NextResponse.json({ data });
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
  let payload: ContasAReceberData;
  try {
    payload = (await request.json()) as ContasAReceberData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readContasAReceber();
    const stamped = applyReceivableHistory(previous.receivables, payload.receivables ?? [], {
      id: user.id,
      name: user.name,
    });
    const data = await writeContasAReceber({ receivables: stamped });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar contas a receber", error);
    return NextResponse.json({ error: "Não foi possível salvar as contas a receber." }, { status: 500 });
  }
}
