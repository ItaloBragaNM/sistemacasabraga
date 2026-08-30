import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { parseCrmWorkbook } from "@/lib/crm/parse";
import { readSnapshot, writeSnapshot } from "@/lib/crm/store.server";
import type { CrmSnapshot } from "@/lib/crm/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("comercial");
  if (error) return error;
  try {
    const snapshot = await readSnapshot();
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Falha ao ler o dashboard comercial", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os dados salvos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error } = await requireModule("comercial");
  if (error) return error;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Envio inválido. Anexe o arquivo .xlsx do CRM." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo recebido. Selecione a planilha do CRM." },
      { status: 400 },
    );
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xlsm")) {
    return NextResponse.json(
      { error: "Formato não suportado. Exporte o CRM em .xlsx." },
      { status: 400 },
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const leads = await parseCrmWorkbook(buffer);
    if (leads.length === 0) {
      return NextResponse.json(
        { error: "Nenhum lead encontrado na planilha." },
        { status: 422 },
      );
    }

    const snapshot: CrmSnapshot = {
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      rowCount: leads.length,
      leads,
    };
    await writeSnapshot(snapshot);
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Falha ao processar a planilha do CRM", error);
    const message =
      error instanceof Error ? error.message : "Não foi possível processar a planilha.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
