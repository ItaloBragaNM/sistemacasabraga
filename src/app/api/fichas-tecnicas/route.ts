import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readFichasTecnicas, writeFichasTecnicas } from "@/lib/fichas-tecnicas/store.server";
import type { FichasTecnicasData } from "@/lib/fichas-tecnicas/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cozinha");
  if (error) return error;
  try {
    const data = await readFichasTecnicas();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler as fichas técnicas", error);
    return NextResponse.json({ error: "Não foi possível carregar as fichas técnicas." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("cozinha");
  if (error) return error;
  let payload: FichasTecnicasData;
  try {
    payload = (await request.json()) as FichasTecnicasData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readFichasTecnicas();
    const data = await writeFichasTecnicas(payload);
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(
      user,
      tagged(diffRecords(previous.sheets, data.sheets, (item) => item.name), "cozinha", "ficha técnica"),
    );
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar as fichas técnicas", error);
    return NextResponse.json({ error: "Não foi possível salvar as fichas técnicas." }, { status: 500 });
  }
}
