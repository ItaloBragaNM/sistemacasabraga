import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readCompromissos, writeCompromissos } from "@/lib/compromissos/store.server";
import type { CompromissosData } from "@/lib/compromissos/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("eventos");
  if (error) return error;
  try {
    const data = await readCompromissos();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler os compromissos", error);
    return NextResponse.json({ error: "Não foi possível carregar os compromissos." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("eventos");
  if (error) return error;
  let payload: CompromissosData;
  try {
    payload = (await request.json()) as CompromissosData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readCompromissos();
    const data = await writeCompromissos(payload);
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
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar os compromissos", error);
    return NextResponse.json({ error: "Não foi possível salvar os compromissos." }, { status: 500 });
  }
}
