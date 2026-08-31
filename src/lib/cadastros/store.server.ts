import { MENU_SECTIONS } from "@/lib/types";
import { readState, writeState } from "@/lib/store/kv.server";
import { defaultCadastros } from "./defaults";
import {
  isKitScale,
  isMaterialKind,
  LEGACY_KIT_SCALE_TO_BASE,
  type CadastrosData,
  type CalcBase,
  type ExtraCatalogItem,
  type MaterialKit,
  type MaterialKitItem,
  type MaterialRecord,
  type StockLocation,
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
    locationId: typeof input.locationId === "string" && input.locationId.trim() ? input.locationId : undefined,
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

function kitScaleBaseId(input: Partial<MaterialKit> & { scale?: unknown }): string {
  if (typeof input.scaleBaseId === "string" && input.scaleBaseId.trim()) return input.scaleBaseId;
  if (isKitScale(input.scale)) return LEGACY_KIT_SCALE_TO_BASE[input.scale];
  return "base-fixo";
}

function normalizeKit(input: Partial<MaterialKit> | null | undefined): MaterialKit | null {
  if (!input?.id || !input.name) return null;
  return {
    id: input.id,
    name: input.name,
    scaleBaseId: kitScaleBaseId(input),
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

function normalizeLocation(input: Partial<StockLocation> | null | undefined): StockLocation | null {
  if (!input?.id || !input.name) return null;
  return {
    id: input.id,
    name: input.name,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function mergeBases(stored: CalcBase[] | undefined, defaults: CalcBase[]): CalcBase[] {
  if (!Array.isArray(stored) || stored.length === 0) return structuredClone(defaults);
  const ids = new Set(stored.map((base) => base.id));
  const missing = defaults.filter((base) => base.builtIn && !ids.has(base.id));
  return missing.length ? [...stored, ...missing] : stored;
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
        hasRechaud: Boolean(dish.hasRechaud),
        hasFritadeira: Boolean(dish.hasFritadeira),
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
    bases: mergeBases(input.bases, base.bases),
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
    stockLocations: Array.isArray(input.stockLocations)
      ? input.stockLocations
          .map((item) => normalizeLocation(item))
          .filter((item): item is StockLocation => Boolean(item))
      : base.stockLocations,
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
