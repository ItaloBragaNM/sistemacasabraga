import type { Cell } from "@/lib/cadastros/xlsx";
import type { MaterialRecord } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import {
  inventoryItemLabel,
  parseStockKey,
  skuBalance,
  stockKey,
  stockSkusForMaterial,
  type StockSku,
} from "@/lib/logistica/calc";
import type { InventorySession } from "@/lib/logistica/types";

export const INVENTORY_SHEET_HEADERS = [
  "ID",
  "Material",
  "Variação",
  "Categoria",
  "Local",
  "Unidade",
  "Saldo atual",
  "Quantidade",
  "Oculto",
  "Data",
  "Responsável",
  "Participantes",
  "Observação",
] as const;

const UNCLASSIFIED_ALIASES = new Set([
  "nao classificado",
  "nao-classificado",
  "sem variacao",
  "sem variante",
  "unclassified",
]);

export interface InventorySheetContext {
  materials: MaterialRecord[];
  balances: Map<string, number>;
  locationName: Map<string, string>;
  date?: string;
  responsible?: string;
  participants?: string[];
  note?: string;
}

export interface InventoryImportResult {
  counted: { materialId: string; variant: string; counted: number }[];
  skipped: { materialId: string; variant: string }[];
  unmatched: string[];
  date: string;
  responsible: string;
  participants: string[];
  note: string;
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const wanted = fold(key);
    const found = entries.find(([header]) => fold(header) === wanted);
    if (found?.[1]?.trim()) return found[1].trim();
  }
  return "";
}

function parseQty(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function isYes(raw: string): boolean {
  const value = fold(raw);
  return ["sim", "s", "x", "1", "true", "oculto", "pular", "yes", "y"].includes(value);
}

function parseIsoDate(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!br) return "";
  const day = Number(br[1]);
  const month = Number(br[2]);
  const year = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitPeople(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function catalogSkus(materials: MaterialRecord[], balances: Map<string, number>): StockSku[] {
  return materials.flatMap((material) =>
    stockSkusForMaterial(material, {
      unclassifiedQty: skuBalance(balances, material.id, ""),
    }),
  );
}

function splitLabel(value: string): { name: string; variant: string } {
  const index = value.lastIndexOf(" - ");
  if (index < 0) return { name: value.trim(), variant: "" };
  return {
    name: value.slice(0, index).trim(),
    variant: value.slice(index + 3).trim(),
  };
}

function normalizeVariantLabel(value: string): string {
  const folded = fold(value);
  if (!folded || UNCLASSIFIED_ALIASES.has(folded)) return "";
  return value.trim();
}

export function buildInventorySheet(context: InventorySheetContext): {
  headers: string[];
  rows: Cell[][];
} {
  const { materials, balances, locationName, date, responsible, participants, note } = context;
  const skus = catalogSkus(materials, balances).sort((a, b) => {
    const materialA = materials.find((item) => item.id === a.materialId);
    const materialB = materials.find((item) => item.id === b.materialId);
    return (
      (materialA?.category ?? "").localeCompare(materialB?.category ?? "", "pt-BR") ||
      a.label.localeCompare(b.label, "pt-BR")
    );
  });

  const rows = skus.map((sku, index) => {
    const material = materials.find((item) => item.id === sku.materialId);
    const qty = skuBalance(balances, sku.materialId, sku.variant);
    return [
      sku.materialId,
      material?.name ?? sku.label,
      sku.variant,
      material?.category ?? "",
      material?.locationId ? locationName.get(material.locationId) ?? "" : "",
      material?.unit ?? "",
      qty,
      qty,
      "",
      index === 0 ? (date ?? "") : "",
      index === 0 ? (responsible ?? "") : "",
      index === 0 ? (participants ?? []).join("; ") : "",
      index === 0 ? (note ?? "") : "",
    ] as Cell[];
  });

  return { headers: [...INVENTORY_SHEET_HEADERS], rows };
}

interface SkuIndex {
  byIdVariant: Map<string, StockSku>;
  byLabel: Map<string, StockSku[]>;
  byNameVariant: Map<string, StockSku[]>;
  byMaterialId: Map<string, StockSku[]>;
  materialsByName: Map<string, MaterialRecord[]>;
}

function nameVariantKey(name: string, variant: string): string {
  return `${fold(name)}||${fold(normalizeVariantLabel(variant))}`;
}

function buildSkuIndex(materials: MaterialRecord[], balances: Map<string, number>): SkuIndex {
  const skus = catalogSkus(materials, balances);
  const byIdVariant = new Map<string, StockSku>();
  const byLabel = new Map<string, StockSku[]>();
  const byNameVariant = new Map<string, StockSku[]>();
  const byMaterialId = new Map<string, StockSku[]>();
  const materialsByName = new Map<string, MaterialRecord[]>();

  for (const material of materials) {
    const key = fold(material.name);
    const list = materialsByName.get(key) ?? [];
    list.push(material);
    materialsByName.set(key, list);
  }

  for (const sku of skus) {
    byIdVariant.set(stockKey(sku.materialId, sku.variant), sku);
    const labelKey = fold(sku.label);
    byLabel.set(labelKey, [...(byLabel.get(labelKey) ?? []), sku]);
    const material = materials.find((item) => item.id === sku.materialId);
    if (material) {
      const nv = nameVariantKey(material.name, sku.variant);
      byNameVariant.set(nv, [...(byNameVariant.get(nv) ?? []), sku]);
    }
    const idList = byMaterialId.get(sku.materialId) ?? [];
    idList.push(sku);
    byMaterialId.set(sku.materialId, idList);
  }

  return { byIdVariant, byLabel, byNameVariant, byMaterialId, materialsByName };
}

function uniqueSku(candidates: StockSku[] | undefined): StockSku | null {
  if (!candidates || candidates.length === 0) return null;
  const keys = new Set(candidates.map((sku) => stockKey(sku.materialId, sku.variant)));
  if (keys.size !== 1) return null;
  return candidates[0] ?? null;
}

function extraSku(material: MaterialRecord, variant: string): StockSku {
  return {
    materialId: material.id,
    variant,
    label: inventoryItemLabel(material, variant, material.id),
  };
}

function matchRow(
  row: Record<string, string>,
  index: SkuIndex,
  materials: MaterialRecord[],
): StockSku | string {
  const id = pick(row, "ID", "Código", "Codigo", "Material ID", "Id material");
  const materialRaw = pick(row, "Material", "Nome", "Item", "Produto");
  const variantRaw = pick(row, "Variação", "Variacao", "Variante", "SKU");
  const variant = normalizeVariantLabel(variantRaw);
  const labelFromName = materialRaw ? fold(materialRaw) : "";

  if (id) {
    const material = materials.find((item) => item.id === id);
    const skus = index.byMaterialId.get(id) ?? [];
    if (!material && skus.length === 0) return materialRaw || id;
    if (variantRaw || variant) {
      const exact = skus.find((sku) => fold(sku.variant) === fold(variant));
      if (exact) return exact;
      if (material) return extraSku(material, variant);
    }
    const unlabeled = uniqueSku(skus.filter((sku) => !sku.variant));
    if (!variant && unlabeled) return unlabeled;
    if (!variant && skus.length === 1) return skus[0]!;
    return materialRaw || id;
  }

  if (labelFromName) {
    const byFullLabel = uniqueSku(index.byLabel.get(labelFromName));
    if (byFullLabel && (!variant || fold(byFullLabel.variant) === fold(variant))) return byFullLabel;
  }

  const split = splitLabel(materialRaw);
  const name = split.name || materialRaw;
  const inferredVariant = variant || normalizeVariantLabel(split.variant);

  if (name) {
    const byNv = uniqueSku(index.byNameVariant.get(nameVariantKey(name, inferredVariant)));
    if (byNv) return byNv;

    const named = index.materialsByName.get(fold(name)) ?? [];
    if (named.length === 1) {
      const material = named[0]!;
      const skus = index.byMaterialId.get(material.id) ?? [];
      if (inferredVariant) {
        const exact = skus.find((sku) => fold(sku.variant) === fold(inferredVariant));
        if (exact) return exact;
        const listed = (material.variants ?? []).find((item) => fold(item) === fold(inferredVariant));
        if (listed) return extraSku(material, listed);
        return extraSku(material, inferredVariant);
      } else if (skus.length === 1) {
        return skus[0]!;
      } else {
        const unlabeled = skus.find((sku) => !sku.variant);
        if (unlabeled) return unlabeled;
      }
    }
  }

  if (materialRaw && inferredVariant) {
    const combined = uniqueSku(index.byLabel.get(fold(`${name} - ${inferredVariant}`)));
    if (combined) return combined;
  }

  return materialRaw || id || `linha sem material`;
}

export function parseInventorySheet(
  rows: Record<string, string>[],
  materials: MaterialRecord[],
  balances: Map<string, number>,
): InventoryImportResult {
  const index = buildSkuIndex(materials, balances);
  const counted = new Map<string, { materialId: string; variant: string; counted: number }>();
  const skipped = new Map<string, { materialId: string; variant: string }>();
  const unmatched: string[] = [];
  let date = "";
  let responsible = "";
  let participants: string[] = [];
  let note = "";

  for (const row of rows) {
    if (!date) date = parseIsoDate(pick(row, "Data", "Date"));
    if (!responsible) responsible = pick(row, "Responsável", "Responsavel");
    if (participants.length === 0) participants = splitPeople(pick(row, "Participantes", "Equipe"));
    if (!note) note = pick(row, "Observação", "Observacao", "Obs", "Nota");

    const identity =
      pick(row, "ID", "Código", "Codigo", "Material ID", "Id material") ||
      pick(row, "Material", "Nome", "Item", "Produto");
    const qtyRaw = pick(row, "Quantidade", "Qtd", "QTD", "Qtde", "Contado", "Contagem");
    const skipFlag = isYes(pick(row, "Oculto", "Pular", "Skip", "Ocultar"));
    if (!identity && !qtyRaw && !skipFlag) continue;

    const matched = matchRow(row, index, materials);
    if (typeof matched === "string") {
      if (identity) unmatched.push(identity);
      continue;
    }

    const key = stockKey(matched.materialId, matched.variant);
    if (skipFlag) {
      counted.delete(key);
      skipped.set(key, { materialId: matched.materialId, variant: matched.variant });
      continue;
    }

    const qty = parseQty(qtyRaw);
    if (qty == null) {
      counted.delete(key);
      skipped.set(key, { materialId: matched.materialId, variant: matched.variant });
      continue;
    }

    skipped.delete(key);
    counted.set(key, { materialId: matched.materialId, variant: matched.variant, counted: qty });
  }

  return {
    counted: [...counted.values()],
    skipped: [...skipped.values()],
    unmatched: [...new Set(unmatched)],
    date,
    responsible,
    participants,
    note,
  };
}

export function sessionFromImport(
  parsed: InventoryImportResult,
  materials: MaterialRecord[],
  balances: Map<string, number>,
): InventorySession {
  const counted = new Map(
    parsed.counted.map((item) => [stockKey(item.materialId, item.variant), item.counted]),
  );

  const items: InventorySession["items"] = [];
  const skipped: InventorySession["skipped"] = [];
  const seen = new Set<string>();

  for (const sku of catalogSkus(materials, balances)) {
    const key = stockKey(sku.materialId, sku.variant);
    seen.add(key);
    if (counted.has(key)) {
      items.push({
        materialId: sku.materialId,
        variant: sku.variant,
        previous: skuBalance(balances, sku.materialId, sku.variant),
        counted: counted.get(key) ?? 0,
      });
    } else {
      skipped.push({ materialId: sku.materialId, variant: sku.variant });
    }
  }

  for (const [key, qty] of counted) {
    if (seen.has(key)) continue;
    const { materialId, variant } = parseStockKey(key);
    items.push({
      materialId,
      variant,
      previous: skuBalance(balances, materialId, variant),
      counted: qty,
    });
  }

  return {
    id: uid(),
    date: parsed.date || new Date().toISOString().slice(0, 10),
    responsible: parsed.responsible,
    participants: parsed.participants,
    note: parsed.note,
    items,
    skipped,
    createdAt: new Date().toISOString(),
  };
}
