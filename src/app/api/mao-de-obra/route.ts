import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readMaoDeObra, readMaoDeObraState, saveMaoDeObra } from "@/lib/mao-de-obra/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { MaoDeObraData } from "@/lib/mao-de-obra/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cadastros");
  if (error) return error;
  try {
    const { data, updatedAt } = await readMaoDeObraState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler a mão de obra", error);
    return NextResponse.json({ error: "Não foi possível carregar a mão de obra externa." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("cadastros");
  if (error) return error;
  let parsed: { body: unknown; updatedAt: string | null };
  try {
    parsed = await parseStatePut(request);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readMaoDeObra();
    const saved = await saveMaoDeObra(parsed.body as MaoDeObraData, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    const { appendAudit, diffRecords, scalarChange, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(user, [
      ...tagged(diffRecords(previous.workers, data.workers, (item) => item.name), "cadastros", "prestador", "Cadastros · Equipe Externa"),
      ...tagged(
        diffRecords(previous.payments, data.payments, (item) => `${item.workerName} · ${item.eventCode}`),
        "financeiro",
        "pagamento",
        "Financeiro · Pagamento de Mão de Obra",
      ),
      ...scalarChange("cadastros", "tabela de valores", previous.rates, data.rates, "Cadastros · Equipe Externa"),
    ]);
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar a mão de obra", error);
    return NextResponse.json({ error: "Não foi possível salvar a mão de obra externa." }, { status: 500 });
  }
}
