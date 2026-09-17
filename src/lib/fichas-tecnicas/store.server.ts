import { readState, writeState } from "@/lib/store/kv.server";
import {
  emptyFichasTecnicas,
  type FichasTecnicasData,
  type RecipeIngredient,
  type TechnicalSheet,
} from "./types";

const KEY = "fichas_tecnicas";
const FILE = "fichas-tecnicas.json";

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIngredient(input: Partial<RecipeIngredient> | null | undefined): RecipeIngredient | null {
  if (!input?.id) return null;
  return {
    id: input.id,
    insumoId: typeof input.insumoId === "string" ? input.insumoId : "",
    name: typeof input.name === "string" ? input.name : "",
    brand: typeof input.brand === "string" ? input.brand : "",
    netQuantity: num(input.netQuantity),
    unit: typeof input.unit === "string" && input.unit.trim() ? input.unit : "g",
    yieldPercent: num(input.yieldPercent) || 100,
    unitCost: num(input.unitCost),
  };
}

function normalizeSheet(input: Partial<TechnicalSheet> | null | undefined): TechnicalSheet | null {
  if (!input?.id || !input.name) return null;
  return {
    id: input.id,
    dishId: typeof input.dishId === "string" ? input.dishId : "",
    name: input.name.trim(),
    classification: typeof input.classification === "string" ? input.classification : "",
    sector: typeof input.sector === "string" && input.sector.trim() ? input.sector : "Alimentos e Bebidas",
    portionSize: typeof input.portionSize === "string" ? input.portionSize : "",
    yieldWeight: num(input.yieldWeight),
    yieldPortions: num(input.yieldPortions),
    yieldWeightUnit: typeof input.yieldWeightUnit === "string" && input.yieldWeightUnit.trim() ? input.yieldWeightUnit : "g",
    salePrice: num(input.salePrice),
    method: typeof input.method === "string" ? input.method : "",
    ingredients: Array.isArray(input.ingredients)
      ? input.ingredients
          .map((item) => normalizeIngredient(item))
          .filter((item): item is RecipeIngredient => Boolean(item))
      : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function normalize(input: Partial<FichasTecnicasData> | null): FichasTecnicasData {
  const base = emptyFichasTecnicas();
  if (!input) return base;
  return {
    sheets: Array.isArray(input.sheets)
      ? input.sheets.map((item) => normalizeSheet(item)).filter((item): item is TechnicalSheet => Boolean(item))
      : base.sheets,
  };
}

export async function readFichasTecnicas(): Promise<FichasTecnicasData> {
  return normalize(await readState<Partial<FichasTecnicasData>>(KEY, FILE));
}

export async function writeFichasTecnicas(data: FichasTecnicasData): Promise<FichasTecnicasData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
