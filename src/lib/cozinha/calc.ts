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

export interface CatalogInsumoLine {
  insumoId: string;
  name: string;
  unit: string;
  dishes: string[];
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
