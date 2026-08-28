import { readState, writeState } from "@/lib/store/kv.server";
import { defaultCadastros } from "./defaults";
import type { CadastrosData } from "./types";

const KEY = "cadastros";
const FILE = "cadastros.json";

function normalize(input: Partial<CadastrosData> | null): CadastrosData {
  const base = defaultCadastros();
  if (!input) return base;
  return {
    materials: Array.isArray(input.materials) ? input.materials : base.materials,
    dishes: Array.isArray(input.dishes) ? input.dishes : base.dishes,
    materialCategories:
      Array.isArray(input.materialCategories) && input.materialCategories.length
        ? input.materialCategories
        : base.materialCategories,
    bases: Array.isArray(input.bases) && input.bases.length ? input.bases : base.bases,
    insumos: Array.isArray(input.insumos) ? input.insumos : base.insumos,
    insumoCategories:
      Array.isArray(input.insumoCategories) && input.insumoCategories.length
        ? input.insumoCategories
        : base.insumoCategories,
    clientes: Array.isArray(input.clientes) ? input.clientes : base.clientes,
    veiculos: Array.isArray(input.veiculos) ? input.veiculos : base.veiculos,
  };
}

export async function readCadastros(): Promise<CadastrosData> {
  const stored = await readState<Partial<CadastrosData>>(KEY, FILE);
  return normalize(stored);
}

export async function writeCadastros(data: CadastrosData): Promise<CadastrosData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
