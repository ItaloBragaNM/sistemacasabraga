import type { MaterialKit } from "./types";
import type { EventRecord, MaterialKitEventState, MaterialSeparationState } from "@/lib/types";

export function suggestedKitQuantity(kit: MaterialKit, event: EventRecord): number {
  switch (kit.scale) {
    case "serviceTeam":
      return Math.max(0, (event.staff.garcons || 0) + (event.staff.garconetes || 0));
    case "islands":
      return Math.max(0, event.islands || 0);
    default:
      return 1;
  }
}

export function kitQuantity(
  kit: MaterialKit,
  event: EventRecord,
  sep: MaterialSeparationState,
): number {
  const stored = sep.kits?.[kit.id]?.quantity;
  if (stored != null && Number.isFinite(stored)) return Math.max(0, stored);
  return suggestedKitQuantity(kit, event);
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
