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
  const { error } = await requireModule("cozinha");
  if (error) return error;
  let payload: FichasTecnicasData;
  try {
    payload = (await request.json()) as FichasTecnicasData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const data = await writeFichasTecnicas(payload);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar as fichas técnicas", error);
    return NextResponse.json({ error: "Não foi possível salvar as fichas técnicas." }, { status: 500 });
  }
}
