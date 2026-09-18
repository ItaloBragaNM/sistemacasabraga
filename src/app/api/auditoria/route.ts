import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readAuditoria } from "@/lib/auditoria/store.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("configuracoes");
  if (error) return error;
  try {
    const data = await readAuditoria();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao ler a auditoria", error);
    return NextResponse.json(
      { error: "Não foi possível carregar o registro de movimentações." },
      { status: 500 },
    );
  }
}
