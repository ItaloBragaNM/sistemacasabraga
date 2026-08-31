import { baseValue, basesMap, eventCalcContext } from "./calc";
import type { CadastrosData, MaterialKit } from "./types";
import type { EventRecord, MaterialKitEventState, MaterialSeparationState } from "@/lib/types";

export function suggestedKitQuantity(
  kit: MaterialKit,
  event: EventRecord,
  cadastros: CadastrosData,
): number {
  const bases = basesMap(cadastros);
  const base = bases.get(kit.scaleBaseId) ?? bases.get("base-fixo");
  if (!base) return 1;
  const ctx = eventCalcContext(event, cadastros);
  const occurrence = ctx.selectedDishIds.length || 1;
  const value = baseValue(base, ctx, occurrence);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value);
}

export function kitQuantity(
  kit: MaterialKit,
  event: EventRecord,
  sep: MaterialSeparationState,
  cadastros: CadastrosData,
): number {
  const stored = sep.kits?.[kit.id]?.quantity;
  if (stored != null && Number.isFinite(stored)) return Math.max(0, stored);
  return suggestedKitQuantity(kit, event, cadastros);
}

export function kitItemComputedTotal(qtyPerKit: number, kitQty: number): number {
  const product = (qtyPerKit || 0) * (kitQty || 0);
  if (!Number.isFinite(product) || product <= 0) return 0;
  return Math.ceil(product);
}

export function kitItemTotal(
  kit: MaterialKit,
  materialId: string,
  qtyPerKit: number,
  kitQty: number,
  state?: MaterialKitEventState,
): number {
  const override = state?.itemTotals?.[materialId];
  if (override != null && Number.isFinite(override)) return Math.max(0, override);
  return kitItemComputedTotal(qtyPerKit, kitQty);
}

export function kitScaleLabel(kit: MaterialKit, cadastros: CadastrosData): string {
  return cadastros.bases.find((base) => base.id === kit.scaleBaseId)?.label ?? "Fixo por evento";
}
