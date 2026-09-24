import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readEventos, writeEventos } from "@/lib/eventos/store.server";
import { syncLaborPaymentsFromEvents } from "@/lib/mao-de-obra/sync.server";
import type { EventRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("eventos");
  if (error) return error;
  try {
    const data = await readEventos();
    return NextResponse.json({ data });
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
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: EventRecord[] }).data
      : null;
  if (!list) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readEventos();
    const data = await writeEventos(list as EventRecord[]);
    try {
      await syncLaborPaymentsFromEvents(data);
    } catch (error) {
      console.error("Falha ao sincronizar pagamentos de mão de obra", error);
    }
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(
      user,
      tagged(
        diffRecords(previous, data, (event) => `${event.code} ${event.title || "sem nome"}`, (event) => {
          const { changeLog: _changeLog, updatedAt: _updatedAt, ...rest } = event;
          return rest;
        }),
        "eventos",
        "evento",
      ),
    );
    try {
      const { notifyFichaUpdates } = await import("@/lib/notificacoes/store.server");
      await notifyFichaUpdates(previous, data, user);
    } catch (notifyError) {
      console.error("Falha ao registrar notificações da ficha", notifyError);
    }
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar os eventos", error);
    return NextResponse.json(
      { error: "Não foi possível salvar os eventos." },
      { status: 500 },
    );
  }
}
