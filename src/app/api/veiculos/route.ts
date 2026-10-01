import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readVeiculosUso, readVeiculosUsoState, saveVeiculosUso } from "@/lib/veiculos/store.server";
import { jsonConflict, jsonState, parseStatePut } from "@/lib/store/http-state";
import type { VeiculosUsoData } from "@/lib/veiculos/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("veiculos");
  if (error) return error;
  try {
    const { data, updatedAt } = await readVeiculosUsoState();
    return jsonState(data, updatedAt);
  } catch (error) {
    console.error("Falha ao ler o uso de veículos", error);
    return NextResponse.json({ error: "Não foi possível carregar o uso dos veículos." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("veiculos");
  if (error) return error;
  let parsed: { body: unknown; updatedAt: string | null };
  try {
    parsed = await parseStatePut(request);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readVeiculosUso();
    const saved = await saveVeiculosUso(parsed.body as VeiculosUsoData, parsed.updatedAt);
    if (saved.conflict) return jsonConflict(saved.data, saved.updatedAt);
    const data = saved.data;
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(
      user,
      tagged(
        diffRecords(previous.usages, data.usages, (item) => `${item.eventId} · ${item.vehicleId}`),
        "veiculos",
        "uso de veículo",
        "Veículos · Agenda de Uso dos Veículos",
      ),
    );
    return jsonState(data, saved.updatedAt);
  } catch (error) {
    console.error("Falha ao salvar o uso de veículos", error);
    return NextResponse.json({ error: "Não foi possível salvar o uso dos veículos." }, { status: 500 });
  }
}
