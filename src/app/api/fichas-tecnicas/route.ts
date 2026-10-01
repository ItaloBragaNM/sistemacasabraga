import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readFichasTecnicas, readFichasTecnicasState, saveFichasTecnicas } from "@/lib/fichas-tecnicas/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { FichasTecnicasData } from "@/lib/fichas-tecnicas/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cozinha");
  if (error) return error;
  try {
    const { data, updatedAt } = await readFichasTecnicasState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler as fichas técnicas", error);
    return NextResponse.json({ error: "Não foi possível carregar as fichas técnicas." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("cozinha");
  if (error) return error;
  let parsed: { body: unknown; updatedAt: string | null };
  try {
    parsed = await parseStatePut(request);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readFichasTecnicas();
    const saved = await saveFichasTecnicas(parsed.body as FichasTecnicasData, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(
      user,
      tagged(diffRecords(previous.sheets, data.sheets, (item) => item.name), "cozinha", "ficha técnica", "Cozinha · Fichas Técnicas"),
    );
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar as fichas técnicas", error);
    return NextResponse.json({ error: "Não foi possível salvar as fichas técnicas." }, { status: 500 });
  }
}
