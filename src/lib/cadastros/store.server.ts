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
