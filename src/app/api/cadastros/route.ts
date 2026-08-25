import { NextResponse } from "next/server";
import { readCadastros, writeCadastros } from "@/lib/cadastros/store.server";
import type { CadastrosData } from "@/lib/cadastros/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await readCadastros();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler os cadastros", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os cadastros." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  let payload: CadastrosData;
  try {
    payload = (await request.json()) as CadastrosData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const data = await writeCadastros(payload);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar os cadastros", error);
    return NextResponse.json(
      { error: "Não foi possível salvar os cadastros." },
      { status: 500 },
    );
  }
}
