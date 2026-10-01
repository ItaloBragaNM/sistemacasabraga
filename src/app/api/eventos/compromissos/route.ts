import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readCompromissos, readCompromissosState, saveCompromissos } from "@/lib/compromissos/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { CompromissosData } from "@/lib/compromissos/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("eventos");
  if (error) return error;
  try {
    const { data, updatedAt } = await readCompromissosState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler os compromissos", error);
    return NextResponse.json({ error: "Não foi possível carregar os compromissos." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("eventos");
  if (error) return error;
  let parsed: { body: unknown; updatedAt: string | null };
  try {
    parsed = await parseStatePut(request);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readCompromissos();
    const saved = await saveCompromissos(parsed.body as CompromissosData, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(
      user,
      tagged(
        diffRecords(previous.meetings, data.meetings, (item) => item.title || "Reunião sem nome"),
        "eventos",
        "compromisso",
        "Eventos · Calendário Geral de Compromissos",
      ),
    );
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar os compromissos", error);
    return NextResponse.json({ error: "Não foi possível salvar os compromissos." }, { status: 500 });
  }
}
