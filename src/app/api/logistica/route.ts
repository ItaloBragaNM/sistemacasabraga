import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readLogistica, writeLogistica } from "@/lib/logistica/store.server";
import type { LogisticaData } from "@/lib/logistica/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("logistica");
  if (error) return error;
  try {
    const data = await readLogistica();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler a logística", error);
    return NextResponse.json({ error: "Não foi possível carregar o estoque." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("logistica");
  if (error) return error;
  let payload: LogisticaData;
  try {
    payload = (await request.json()) as LogisticaData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readLogistica();
    const data = await writeLogistica(payload);
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(user, [
      ...tagged(
        diffRecords(previous.movements, data.movements, (item) => item.note || item.id),
        "logistica",
        "movimento de estoque",
      ),
      ...tagged(
        diffRecords(previous.inventories, data.inventories, (item) => item.date || item.id),
        "logistica",
        "inventário",
      ),
    ]);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar a logística", error);
    return NextResponse.json({ error: "Não foi possível salvar o estoque." }, { status: 500 });
  }
}
