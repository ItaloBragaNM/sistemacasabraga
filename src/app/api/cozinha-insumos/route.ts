import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readCozinhaInsumos, writeCozinhaInsumos } from "@/lib/cozinha/store.server";
import type { CozinhaInsumosData } from "@/lib/cozinha/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cozinha");
  if (error) return error;
  try {
    const data = await readCozinhaInsumos();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler o estoque de insumos", error);
    return NextResponse.json({ error: "Não foi possível carregar o estoque de insumos." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { error } = await requireModule("cozinha");
  if (error) return error;
  let payload: CozinhaInsumosData;
  try {
    payload = (await request.json()) as CozinhaInsumosData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const data = await writeCozinhaInsumos(payload);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar o estoque de insumos", error);
    return NextResponse.json({ error: "Não foi possível salvar o estoque de insumos." }, { status: 500 });
  }
}
