import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readVeiculosUso, writeVeiculosUso } from "@/lib/veiculos/store.server";
import type { VeiculosUsoData } from "@/lib/veiculos/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("veiculos");
  if (error) return error;
  try {
    const data = await readVeiculosUso();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler o uso de veículos", error);
    return NextResponse.json({ error: "Não foi possível carregar o uso dos veículos." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, error } = await requireModule("veiculos");
  if (error) return error;
  let payload: VeiculosUsoData;
  try {
    payload = (await request.json()) as VeiculosUsoData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readVeiculosUso();
    const data = await writeVeiculosUso(payload);
    const { appendAudit, diffRecords, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(
      user,
      tagged(
        diffRecords(previous.usages, data.usages, (item) => `${item.eventId} · ${item.vehicleId}`),
        "veiculos",
        "uso de veículo",
      ),
    );
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar o uso de veículos", error);
    return NextResponse.json({ error: "Não foi possível salvar o uso dos veículos." }, { status: 500 });
  }
}
