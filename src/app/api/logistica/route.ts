import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readLogistica, readLogisticaState, saveLogistica } from "@/lib/logistica/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { LogisticaData } from "@/lib/logistica/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("logistica");
  if (error) return error;
  try {
    const { data, updatedAt } = await readLogisticaState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler a logística", error);
    return NextResponse.json({ error: "Não foi possível carregar o estoque." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("logistica");
  if (error) return error;
  let parsed: { body: unknown; updatedAt: string | null };
  try {
    parsed = await parseStatePut(request);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readLogistica();
    const saved = await saveLogistica(parsed.body as LogisticaData, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(user, [
      ...tagged(
        diffRecords(previous.movements, data.movements, (item) => item.note || item.id),
        "logistica",
        "movimento de estoque",
        "Logística · Estoque de Materiais",
      ),
      ...tagged(
        diffRecords(previous.inventories, data.inventories, (item) => item.date || item.id),
        "logistica",
        "inventário",
        "Logística · Inventário de Materiais",
      ),
      ...tagged(
        diffRecords(previous.eventControls, data.eventControls, (item) => item.eventCode || item.id),
        "logistica",
        "controle de materiais",
        "Logística · Controle de Materiais em Eventos",
      ),
    ]);
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar a logística", error);
    return NextResponse.json({ error: "Não foi possível salvar o estoque." }, { status: 500 });
  }
}
