import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readEventos, readEventosState, saveEventos } from "@/lib/eventos/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import { syncLaborPaymentsFromEvents } from "@/lib/mao-de-obra/sync.server";
import { eventChangeLabels } from "@/lib/eventos/changelog";
import type { EventRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("eventos");
  if (error) return error;
  try {
    const { data, updatedAt } = await readEventosState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler os eventos", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os eventos." },
      { status: 500 },
    );
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

  const list = Array.isArray(parsed.body) ? parsed.body : null;
  if (!list) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readEventos();
    const saved = await saveEventos(list as EventRecord[], parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    try {
      await syncLaborPaymentsFromEvents(data);
    } catch (syncError) {
      console.error("Falha ao sincronizar pagamentos de mão de obra", syncError);
    }
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    const beforeById = new Map(previous.map((event) => [event.id, event]));
    await appendAudit(
      user,
      tagged(
        diffRecords(previous, data, (event) => {
          const name = `${event.code} · ${event.title || "sem nome"}`;
          const detail = eventChangeLabels(beforeById.get(event.id) ?? null, event).slice(0, 6).join(", ");
          return detail ? `${name} — ${detail}` : name;
        }, (event) => ({ ...event, changeLog: undefined, updatedAt: undefined })),
        "eventos",
        "evento",
        "Eventos · Relatório do Evento",
      ),
    );
    try {
      const { notifyFichaUpdates } = await import("@/lib/notificacoes/store.server");
      await notifyFichaUpdates(previous, data, user);
    } catch (notifyError) {
      console.error("Falha ao registrar notificações da ficha", notifyError);
    }
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar os eventos", error);
    return NextResponse.json(
      { error: "Não foi possível salvar os eventos." },
      { status: 500 },
    );
  }
}
