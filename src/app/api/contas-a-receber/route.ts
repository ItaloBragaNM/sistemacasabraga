import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
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
  let payload: ContasAReceberData;
  try {
    payload = (await request.json()) as ContasAReceberData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readContasAReceber();
    const data = await writeContasAReceber(payload);
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(user, [
      ...tagged(
        diffRecords(previous.receivables, data.receivables, (item) => item.clientName || item.description || item.id),
        "financeiro",
        "conta a receber",
      ),
    ]);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar contas a receber", error);
    return NextResponse.json({ error: "Não foi possível salvar as contas a receber." }, { status: 500 });
  }
}
