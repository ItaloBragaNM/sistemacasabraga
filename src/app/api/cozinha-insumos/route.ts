import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readCozinhaInsumos, readCozinhaInsumosState, saveCozinhaInsumos } from "@/lib/cozinha/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { CozinhaInsumosData } from "@/lib/cozinha/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cozinha");
  if (error) return error;
  try {
    const { data, updatedAt } = await readCozinhaInsumosState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler o estoque de insumos", error);
    return NextResponse.json({ error: "Não foi possível carregar o estoque de insumos." }, { status: 500 });
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
    const previous = await readCozinhaInsumos();
    const saved = await saveCozinhaInsumos(parsed.body as CozinhaInsumosData, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    const isCount = (item: { type?: string }) => item.type === "inventario";
    await appendAudit(user, [
      ...tagged(
        diffRecords(
          previous.movements.filter((item) => !isCount(item)),
          data.movements.filter((item) => !isCount(item)),
          (item) => item.note || item.id,
        ),
        "cozinha",
        "movimento de insumo",
        "Cozinha · Movimentações no Estoque",
      ),
      ...tagged(
        diffRecords(previous.inventories ?? [], data.inventories ?? [], (item) => item.date || item.id),
        "cozinha",
        "inventário de insumo",
        "Cozinha · Inventário de Insumos",
      ),
      ...tagged(
        diffRecords(previous.losses, data.losses, (item) => item.note || item.id),
        "cozinha",
        "perda",
        "Cozinha · Registro de Desperdícios",
      ),
    ]);
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar o estoque de insumos", error);
    return NextResponse.json({ error: "Não foi possível salvar o estoque de insumos." }, { status: 500 });
  }
}
