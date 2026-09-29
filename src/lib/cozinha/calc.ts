import type { DishRecord, InsumoRecord } from "@/lib/cadastros/types";
import type {
  CozinhaInsumosData,
  InsumoInventoryScope,
  InsumoInventorySession,
  InsumoLoss,
  InsumoMeta,
  InsumoMovement,
} from "./types";

const TZ = "America/Sao_Paulo";

/** Janela do consumo médio diário usado no estoque mínimo. */
export const CONSUMPTION_WINDOW_DAYS = 30;

export const COUNT_INTERVAL_DAYS: Record<InsumoInventoryScope, number> = {
  semanal: 7,
  mensal: 30,
};

export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function shiftIsoDate(iso: string, days: number) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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
  return (
    map.get(insumoId) ?? {
      insumoId,
      min: 0,
      leadDays: 0,
      minSource: "calculo",
      perishable: false,
    }
  );
}

export function consumptionInWindow(movements: InsumoMovement[], insumoId: string, today = todayIso()) {
  const start = shiftIsoDate(today, -(CONSUMPTION_WINDOW_DAYS - 1));
  let total = 0;
  for (const movement of movements) {
    if (movement.insumoId !== insumoId) continue;
    if (movement.type !== "saida" && movement.type !== "perda") continue;
    const day = movement.date.slice(0, 10);
    if (day < start || day > today) continue;
    total += Math.abs(movement.quantity);
  }
  return total;
}

export function averageDailyConsumption(movements: InsumoMovement[], insumoId: string, today = todayIso()) {
  return consumptionInWindow(movements, insumoId, today) / CONSUMPTION_WINDOW_DAYS;
}

/** Ponto de pedido: o que se consome enquanto o fornecedor não repõe. */
export function suggestedMinimum(daily: number, leadDays: number) {
  if (!(leadDays > 0) || !(daily > 0)) return 0;
  return Math.round(daily * leadDays * 100) / 100;
}

export function effectiveMinimum(meta: InsumoMeta, daily: number) {
  if (meta.minSource === "manual") return Math.max(0, meta.min);
  return suggestedMinimum(daily, meta.leadDays);
}

export type StockSignal = "comprar" | "excesso" | "ok" | "sem-regra";

export function stockSignal(balance: number, meta: InsumoMeta, daily: number): StockSignal {
  const min = effectiveMinimum(meta, daily);
  if (!(min > 0)) return "sem-regra";
  if (balance <= min) return "comprar";
  if (balance > min * 3) return "excesso";
  return "ok";
}

export function coverageDays(balance: number, daily: number) {
  if (!(daily > 0) || balance < 0) return null;
  return balance / daily;
}

export function latestInventory(sessions: InsumoInventorySession[], scope: InsumoInventoryScope) {
  return (
    [...sessions].filter((session) => session.scope === scope).sort((a, b) => b.date.localeCompare(a.date))[0] ??
    null
  );
}

export function nextCountDate(lastDate: string | undefined, scope: InsumoInventoryScope) {
  if (!lastDate) return null;
  return shiftIsoDate(lastDate, COUNT_INTERVAL_DAYS[scope]);
}

export function inventoryIsDue(lastDate: string | undefined, scope: InsumoInventoryScope, today = todayIso()) {
  const next = nextCountDate(lastDate, scope);
  return !next || next <= today;
}

export function movementsFromInsumoInventory(session: InsumoInventorySession): InsumoMovement[] {
  const note = session.scope === "semanal" ? "Contagem semanal" : "Contagem mensal";
  return session.items
    .filter((item) => item.counted - item.previous !== 0)
    .map((item) => ({
      id: `inv-${session.id}-${item.insumoId}`,
      insumoId: item.insumoId,
      type: "inventario" as const,
      quantity: Math.round((item.counted - item.previous) * 1000) / 1000,
      date: session.date,
      note,
      ref: session.id,
    }));
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
