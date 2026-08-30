import { MENU_SECTIONS } from "@/lib/types";
import { readState, writeState } from "@/lib/store/kv.server";
import { defaultCadastros } from "./defaults";
import {
  isKitScale,
  isMaterialKind,
  type CadastrosData,
  type ExtraCatalogItem,
  type MaterialKit,
  type MaterialKitItem,
  type MaterialRecord,
} from "./types";

const KEY = "cadastros";
const FILE = "cadastros.json";

function dishCategoryLabel(value: string): string {
  const section = MENU_SECTIONS.find((item) => item.key === value);
  return section ? section.label : value;
}

function normalizeMaterial(input: Partial<MaterialRecord>, fallbackCategory: string): MaterialRecord | null {
  if (!input.id || !input.name) return null;
  return {
    id: input.id,
    name: input.name,
    category: input.category || fallbackCategory,
    unit: input.unit || "un",
    kind: isMaterialKind(input.kind) ? input.kind : "permanente",
    variants: Array.isArray(input.variants)
      ? input.variants.map((item) => item.trim()).filter(Boolean)
      : [],
    factors: Array.isArray(input.factors) ? input.factors : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function normalizeKitItem(input: Partial<MaterialKitItem> | null | undefined): MaterialKitItem | null {
  if (!input?.materialId) return null;
  const qty = Number(input.qtyPerKit);
  return {
    materialId: input.materialId,
    qtyPerKit: Number.isFinite(qty) && qty > 0 ? qty : 1,
  };
}

function normalizeKit(input: Partial<MaterialKit> | null | undefined): MaterialKit | null {
  if (!input?.id || !input.name) return null;
  return {
    id: input.id,
    name: input.name,
    scale: isKitScale(input.scale) ? input.scale : "fixed",
    items: Array.isArray(input.items)
      ? input.items
          .map((item) => normalizeKitItem(item))
          .filter((item): item is MaterialKitItem => Boolean(item))
      : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function normalizeExtra(input: Partial<ExtraCatalogItem> | null | undefined): ExtraCatalogItem | null {
  if (!input?.id || !input.name) return null;
  return {
    id: input.id,
    name: input.name,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function normalize(input: Partial<CadastrosData> | null): CadastrosData {
  const base = defaultCadastros();
  if (!input) return base;

  const materialCategories =
    Array.isArray(input.materialCategories) && input.materialCategories.length
      ? input.materialCategories
      : base.materialCategories;
  const fallbackCategory = materialCategories[0] ?? "Outros";

  const materials = Array.isArray(input.materials)
    ? input.materials
        .map((item) => normalizeMaterial(item, fallbackCategory))
        .filter((item): item is MaterialRecord => Boolean(item))
    : base.materials;

  const dishCategoriesSource =
    Array.isArray(input.dishCategories) && input.dishCategories.length
      ? input.dishCategories.map(dishCategoryLabel)
      : base.dishCategories;

  const dishes = Array.isArray(input.dishes)
    ? input.dishes.map((dish) => ({
        ...dish,
        category: dishCategoryLabel(dish.category || dishCategoriesSource[0] || "Menu"),
      }))
    : base.dishes;

  const usedDishCategories = dishes.map((dish) => dish.category);
  const dishCategories = [
    ...dishCategoriesSource,
    ...usedDishCategories.filter((name) => !dishCategoriesSource.includes(name)),
  ];

  return {
    materials,
    dishes,
    materialCategories,
    dishCategories,
    bases: Array.isArray(input.bases) && input.bases.length ? input.bases : base.bases,
    insumos: Array.isArray(input.insumos) ? input.insumos : base.insumos,
    insumoCategories:
      Array.isArray(input.insumoCategories) && input.insumoCategories.length
        ? input.insumoCategories
        : base.insumoCategories,
    clientes: Array.isArray(input.clientes) ? input.clientes : base.clientes,
    veiculos: Array.isArray(input.veiculos) ? input.veiculos : base.veiculos,
    kits: Array.isArray(input.kits)
      ? input.kits.map((kit) => normalizeKit(kit)).filter((kit): kit is MaterialKit => Boolean(kit))
      : base.kits,
    extras: Array.isArray(input.extras)
      ? input.extras
          .map((item) => normalizeExtra(item))
          .filter((item): item is ExtraCatalogItem => Boolean(item))
      : base.extras,
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
