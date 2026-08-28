import type { LogisticaData, StockMeta, StockMovement } from "./types";

/** Saldo atual de cada material = soma das quantidades (com sinal) das movimentações. */
export function computeBalances(movements: StockMovement[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const movement of movements) {
    balances.set(movement.materialId, (balances.get(movement.materialId) ?? 0) + movement.quantity);
  }
  return balances;
}

export function balanceOf(balances: Map<string, number>, materialId: string): number {
  return balances.get(materialId) ?? 0;
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
