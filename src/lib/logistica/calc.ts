import type { LogisticaData, StockMeta, StockMovement } from "./types";

const KEY_SEP = "\u001f";

export function normalizeVariant(variant?: string | null): string {
  return (variant ?? "").trim();
}

export function stockKey(materialId: string, variant?: string | null): string {
  return `${materialId}${KEY_SEP}${normalizeVariant(variant)}`;
}

export function parseStockKey(key: string): { materialId: string; variant: string } {
  const index = key.indexOf(KEY_SEP);
  if (index < 0) return { materialId: key, variant: "" };
  return { materialId: key.slice(0, index), variant: key.slice(index + 1) };
}

export function listedVariants(variants: string[] | undefined): string[] {
  return (variants ?? []).map((item) => item.trim()).filter(Boolean);
}

export function stockItemLabel(materialName: string, variant?: string | null): string {
  const value = normalizeVariant(variant);
  return value ? `${materialName} - ${value}` : materialName;
}

export function inventoryItemLabel(
  material: { name: string; variants?: string[] } | undefined,
  variant: string | undefined,
  fallbackId: string,
): string {
  const name = material?.name ?? fallbackId;
  const value = normalizeVariant(variant);
  if (value) return stockItemLabel(name, value);
  if (listedVariants(material?.variants).length > 0) return `${name} - Não classificado`;
  return name;
}

export interface StockSku {
  materialId: string;
  variant: string;
  label: string;
}

/** SKUs a contar: cada variação, ou uma linha só se o material não tiver variação. */
export function stockSkusForMaterial(
  material: { id: string; name: string; variants?: string[] },
  options?: { unclassifiedQty?: number },
): StockSku[] {
  const variants = listedVariants(material.variants);
  if (variants.length === 0) {
    return [{ materialId: material.id, variant: "", label: material.name }];
  }
  const skus = variants.map((variant) => ({
    materialId: material.id,
    variant,
    label: stockItemLabel(material.name, variant),
  }));
  if ((options?.unclassifiedQty ?? 0) !== 0) {
    skus.push({
      materialId: material.id,
      variant: "",
      label: `${material.name} - Não classificado`,
    });
  }
  return skus;
}

/** Saldo por SKU (material + variação). */
export function computeBalances(movements: StockMovement[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const movement of movements) {
    const key = stockKey(movement.materialId, movement.variant);
    balances.set(key, (balances.get(key) ?? 0) + movement.quantity);
  }
  return balances;
}

export function skuBalance(
  balances: Map<string, number>,
  materialId: string,
  variant?: string | null,
): number {
  return balances.get(stockKey(materialId, variant)) ?? 0;
}

export function materialTotal(balances: Map<string, number>, materialId: string): number {
  let total = 0;
  for (const [key, quantity] of balances) {
    if (parseStockKey(key).materialId === materialId) total += quantity;
  }
  return total;
}

export function variantBreakdown(
  balances: Map<string, number>,
  materialId: string,
  variants: string[] | undefined,
): { variant: string; label: string; qty: number }[] {
  const listed = listedVariants(variants);
  const rows = listed.map((variant) => ({
    variant,
    label: variant,
    qty: skuBalance(balances, materialId, variant),
  }));
  const leftover = skuBalance(balances, materialId, "");
  if (listed.length > 0 && leftover !== 0) {
    rows.push({ variant: "", label: "Não classificado", qty: leftover });
  }
  return rows;
}

export function metaMap(meta: StockMeta[]): Map<string, StockMeta> {
  return new Map(meta.map((item) => [item.materialId, item]));
}

export function getMeta(meta: Map<string, StockMeta>, materialId: string): StockMeta {
  return meta.get(materialId) ?? { materialId, min: 0, location: "" };
}

export function movementsOf(data: LogisticaData, materialId: string): StockMovement[] {
  return data.movements
    .filter((movement) => movement.materialId === materialId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Most recent inventory date (YYYY-MM-DD) in which the material (any variant) was counted. */
export function lastInventoryDate(
  inventories: { date: string; items: { materialId: string }[] }[],
  materialId: string,
): string | undefined {
  let latest: string | undefined;
  for (const session of inventories) {
    if (!session.items.some((item) => item.materialId === materialId)) continue;
    const day = session.date.slice(0, 10);
    if (!latest || day > latest) latest = day;
  }
  return latest;
}
