import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readMaoDeObra, writeMaoDeObra } from "@/lib/mao-de-obra/store.server";
import type { MaoDeObraData } from "@/lib/mao-de-obra/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("administrativo");
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
  const { error } = await requireModule("administrativo");
  if (error) return error;
  let payload: MaoDeObraData;
  try {
    payload = (await request.json()) as MaoDeObraData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const data = await writeMaoDeObra(payload);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar a mão de obra", error);
    return NextResponse.json({ error: "Não foi possível salvar a mão de obra externa." }, { status: 500 });
  }
}
