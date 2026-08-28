import { NextResponse } from "next/server";
import { readLogistica, writeLogistica } from "@/lib/logistica/store.server";
import type { LogisticaData } from "@/lib/logistica/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await readLogistica();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler a logística", error);
    return NextResponse.json({ error: "Não foi possível carregar o estoque." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let payload: LogisticaData;
  try {
    payload = (await request.json()) as LogisticaData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const data = await writeLogistica(payload);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar a logística", error);
    return NextResponse.json({ error: "Não foi possível salvar o estoque." }, { status: 500 });
  }
}
