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
      ...tagged(diffRecords(previous.dishes, data.dishes, (item) => item.name), "cadastros", "prato", "Cadastros · Cardápio"),
      ...tagged(diffRecords(previous.materials, data.materials, (item) => item.name), "cadastros", "material", "Cadastros · Materiais"),
      ...tagged(diffRecords(previous.insumos, data.insumos, (item) => item.name), "cadastros", "insumo", "Cadastros · Insumos"),
      ...tagged(diffRecords(previous.clientes, data.clientes, (item) => item.name), "cadastros", "cliente", "Cadastros · Clientes"),
      ...tagged(diffRecords(previous.locais, data.locais, (item) => item.name), "cadastros", "local", "Cadastros · Locais"),
      ...tagged(diffRecords(previous.veiculos, data.veiculos, (item) => item.name), "cadastros", "veículo", "Cadastros · Veículos"),
      ...tagged(diffRecords(previous.kits, data.kits, (item) => item.name), "cadastros", "kit", "Cadastros · Kits de Materiais"),
      ...tagged(diffRecords(previous.extras, data.extras, (item) => item.name), "cadastros", "extra", "Cadastros · Kits de Materiais"),
      ...tagged(diffRecords(previous.stockLocations, data.stockLocations, (item) => item.name), "cadastros", "local de estoque", "Configurações · Módulo de Cadastros"),
      ...tagged(diffRecords(previous.bases, data.bases, (item) => item.label), "cadastros", "base de cálculo", "Configurações · Módulo de Cadastros"),
      ...scalarChange("cadastros", "categorias do cardápio", previous.dishCategories, data.dishCategories, "Configurações · Módulo de Cadastros"),
      ...scalarChange("cadastros", "categorias de materiais", previous.materialCategories, data.materialCategories, "Configurações · Módulo de Cadastros"),
      ...scalarChange("cadastros", "categorias de insumos", previous.insumoCategories, data.insumoCategories, "Configurações · Módulo de Cadastros"),
      ...scalarChange("cadastros", "premissas de bebidas", previous.drinkPremises, data.drinkPremises, "Configurações · Módulo de Cadastros"),
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
