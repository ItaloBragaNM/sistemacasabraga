import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readMaoDeObra, writeMaoDeObra } from "@/lib/mao-de-obra/store.server";
import type { MaoDeObraData } from "@/lib/mao-de-obra/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cadastros");
  if (error) return error;
  try {
    const data = await readMaoDeObra();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler a mão de obra", error);
    return NextResponse.json({ error: "Não foi possível carregar a mão de obra externa." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("cadastros");
  if (error) return error;
  let payload: MaoDeObraData;
  try {
    payload = (await request.json()) as MaoDeObraData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readMaoDeObra();
    const data = await writeMaoDeObra(payload);
    const { appendAudit, diffRecords, scalarChange, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(user, [
      ...tagged(diffRecords(previous.workers, data.workers, (item) => item.name), "cadastros", "prestador"),
      ...tagged(
        diffRecords(previous.payments, data.payments, (item) => `${item.workerName} · ${item.eventCode}`),
        "financeiro",
        "pagamento",
      ),
      ...scalarChange("cadastros", "tabela de valores", previous.rates, data.rates),
    ]);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar a mão de obra", error);
    return NextResponse.json({ error: "Não foi possível salvar a mão de obra externa." }, { status: 500 });
  }
}
