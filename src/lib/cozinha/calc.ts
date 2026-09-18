import { adjustedQuantity } from "@/lib/fichas-tecnicas/calc";
import type { TechnicalSheet } from "@/lib/fichas-tecnicas/types";
import type { DishRecord, InsumoRecord } from "@/lib/cadastros/types";
import type {
  CozinhaInsumosData,
  InsumoLoss,
  InsumoMeta,
  InsumoMovement,
} from "./types";

/* --------------------------------------------------------------- estoque */

export function computeInsumoBalances(movements: InsumoMovement[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const movement of movements) {
    balances.set(movement.insumoId, (balances.get(movement.insumoId) ?? 0) + movement.quantity);
  }
  return balances;
}

export function insumoBalance(balances: Map<string, number>, insumoId: string): number {
  return balances.get(insumoId) ?? 0;
}

export function insumoMetaMap(meta: InsumoMeta[]): Map<string, InsumoMeta> {
  return new Map(meta.map((item) => [item.insumoId, item]));
}

export function getInsumoMeta(map: Map<string, InsumoMeta>, insumoId: string): InsumoMeta {
  return map.get(insumoId) ?? { insumoId, min: 0 };
}

export function movementsOfInsumo(data: CozinhaInsumosData, insumoId: string): InsumoMovement[] {
  return data.movements
    .filter((movement) => movement.insumoId === insumoId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function lossMovementId(lossId: string) {
  return `perda-${lossId}`;
}

/** Um movimento de saída derivado de uma perda registrada. */
export function movementFromLoss(loss: InsumoLoss): InsumoMovement {
  return {
    id: lossMovementId(loss.id),
    insumoId: loss.insumoId,
    type: "perda",
    quantity: -Math.abs(loss.quantity),
    date: loss.date,
    note: loss.note,
    ref: loss.id,
  };
}

/* --------------------------------------------------- separação por evento */

export interface InsumoNeed {
  key: string;
  insumoId: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dishes: string[];
}

export interface DishSheetLink {
  dishId: string;
  dishName: string;
  sheet: TechnicalSheet;
}

export function dishSheetLinks(
  selectedDishIds: string[],
  dishes: DishRecord[],
  sheets: TechnicalSheet[],
): DishSheetLink[] {
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const sheetByDish = new Map(sheets.filter((sheet) => sheet.dishId).map((sheet) => [sheet.dishId, sheet]));
  const links: DishSheetLink[] = [];
  for (const dishId of selectedDishIds) {
    const sheet = sheetByDish.get(dishId);
    if (!sheet) continue;
    links.push({
      dishId,
      dishName: dishById.get(dishId)?.name ?? sheet.name,
      sheet,
    });
  }
  return links;
}

export function insumoNeedsForEvent(params: {
  links: DishSheetLink[];
  portions: Record<string, number>;
  defaultPortions: number;
  insumos: InsumoRecord[];
}): InsumoNeed[] {
  const insumoById = new Map(params.insumos.map((insumo) => [insumo.id, insumo]));
  const map = new Map<string, InsumoNeed>();

  for (const link of params.links) {
    const portions = params.portions[link.dishId] ?? params.defaultPortions;
    const batch = link.sheet.yieldPortions > 0 ? link.sheet.yieldPortions : portions || 1;
    const multiplier = batch > 0 ? portions / batch : 0;
    if (multiplier <= 0) continue;

    for (const ingredient of link.sheet.ingredients) {
      const insumo = ingredient.insumoId ? insumoById.get(ingredient.insumoId) : undefined;
      const key = ingredient.insumoId || `avulso:${ingredient.name.trim().toLowerCase()}`;
      if (!key || key === "avulso:") continue;
      const quantity = adjustedQuantity(ingredient) * multiplier;
      const unitCost = insumo?.unitCost || ingredient.unitCost || 0;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += quantity;
        existing.totalCost += quantity * unitCost;
        if (!existing.dishes.includes(link.dishName)) existing.dishes.push(link.dishName);
      } else {
        map.set(key, {
          key,
          insumoId: ingredient.insumoId || "",
          name: insumo?.name || ingredient.name || "Ingrediente",
          unit: insumo?.unit || ingredient.unit || "",
          quantity,
          unitCost,
          totalCost: quantity * unitCost,
          dishes: [link.dishName],
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface DishInsumoGroup {
  dishId: string;
  dishName: string;
  portions: number;
  items: InsumoNeed[];
}

export function insumoNeedsGroupedByDish(params: {
  links: DishSheetLink[];
  portions: Record<string, number>;
  defaultPortions: number;
  insumos: InsumoRecord[];
}): DishInsumoGroup[] {
  return params.links
    .map((link) => {
      const portions = params.portions[link.dishId] ?? params.defaultPortions;
      return {
        dishId: link.dishId,
        dishName: link.dishName,
        portions,
        items: insumoNeedsForEvent({
          links: [link],
          portions: params.portions,
          defaultPortions: params.defaultPortions,
          insumos: params.insumos,
        }),
      };
    })
    .filter((group) => group.items.length > 0);
}

/** Lista de insumos a partir do cadastro do prato — sem quantidade calculada. */
export interface CatalogInsumoLine {
  insumoId: string;
  name: string;
  unit: string;
  dishes: string[];
}

export function insumoListFromDishes(
  selectedDishIds: string[],
  dishes: DishRecord[],
  insumos: InsumoRecord[],
): CatalogInsumoLine[] {
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const insumoById = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const map = new Map<string, CatalogInsumoLine>();

  for (const dishId of selectedDishIds) {
    const dish = dishById.get(dishId);
    if (!dish) continue;
    for (const insumoId of dish.insumoIds ?? []) {
      const insumo = insumoById.get(insumoId);
      if (!insumo) continue;
      const existing = map.get(insumoId);
      if (existing) {
        if (!existing.dishes.includes(dish.name)) existing.dishes.push(dish.name);
      } else {
        map.set(insumoId, {
          insumoId,
          name: insumo.name,
          unit: insumo.unit,
          dishes: [dish.name],
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface CatalogDishGroup {
  dishId: string;
  dishName: string;
  items: CatalogInsumoLine[];
}

export function insumoListGroupedByDish(
  selectedDishIds: string[],
  dishes: DishRecord[],
  insumos: InsumoRecord[],
): CatalogDishGroup[] {
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const insumoById = new Map(insumos.map((insumo) => [insumo.id, insumo]));
  const groups: CatalogDishGroup[] = [];
  for (const dishId of selectedDishIds) {
    const dish = dishById.get(dishId);
    if (!dish) continue;
    const items: CatalogInsumoLine[] = [];
    for (const insumoId of dish.insumoIds ?? []) {
      const insumo = insumoById.get(insumoId);
      if (!insumo) continue;
      items.push({
        insumoId,
        name: insumo.name,
        unit: insumo.unit,
        dishes: [dish.name],
      });
    }
    if (items.length === 0) continue;
    groups.push({
      dishId: dish.id,
      dishName: dish.name,
      items: items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    });
  }
  return groups;
}
