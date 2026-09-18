import { NextResponse } from "next/server";
import { requireModule } from "@/lib/auth/server";
import { readCadastros, writeCadastros } from "@/lib/cadastros/store.server";
import type { CadastrosData } from "@/lib/cadastros/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireModule("cadastros");
  if (error) return error;
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
  const { user, error } = await requireModule("cadastros");
  if (error) return error;
  let payload: CadastrosData;
  try {
    payload = (await request.json()) as CadastrosData;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const previous = await readCadastros();
    const data = await writeCadastros(payload);
    const { appendAudit, diffRecords, scalarChange, tagged } = await import("@/lib/auditoria/store.server");
    await appendAudit(user, [
      ...tagged(diffRecords(previous.dishes, data.dishes, (item) => item.name), "cadastros", "prato"),
      ...tagged(diffRecords(previous.materials, data.materials, (item) => item.name), "cadastros", "material"),
      ...tagged(diffRecords(previous.insumos, data.insumos, (item) => item.name), "cadastros", "insumo"),
      ...tagged(diffRecords(previous.clientes, data.clientes, (item) => item.name), "cadastros", "cliente"),
      ...tagged(diffRecords(previous.veiculos, data.veiculos, (item) => item.name), "cadastros", "veículo"),
      ...tagged(diffRecords(previous.kits, data.kits, (item) => item.name), "cadastros", "kit"),
      ...tagged(diffRecords(previous.extras, data.extras, (item) => item.name), "cadastros", "extra"),
      ...tagged(diffRecords(previous.stockLocations, data.stockLocations, (item) => item.name), "cadastros", "local de estoque"),
      ...tagged(diffRecords(previous.bases, data.bases, (item) => item.label), "cadastros", "base de cálculo"),
      ...scalarChange("cadastros", "categorias do cardápio", previous.dishCategories, data.dishCategories),
      ...scalarChange("cadastros", "categorias de materiais", previous.materialCategories, data.materialCategories),
      ...scalarChange("cadastros", "categorias de insumos", previous.insumoCategories, data.insumoCategories),
      ...scalarChange("cadastros", "premissas de bebidas", previous.drinkPremises, data.drinkPremises),
    ]);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Falha ao salvar os cadastros", error);
    return NextResponse.json(
      { error: "Não foi possível salvar os cadastros." },
      { status: 500 },
    );
  }
}
