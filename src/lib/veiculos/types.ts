export {
  VEHICLE_USAGE_CATEGORIES,
  VEHICLE_USAGE_CATEGORY_LABELS,
  isVehicleUsageCategory,
  type VehicleUsageCategory,
} from "@/lib/cadastros/types";

export type VehicleChecklistStatus = "gerado" | "assinado";

export function usageIdFor(eventId: string, vehicleId: string) {
  return `uso-${eventId}-${vehicleId}`;
}

/** Status antigo do checklist por evento. O registro semanal fica na página Registro de Uso. */
export interface VehicleUsageRecord {
  id: string;
  eventId: string;
  vehicleId: string;
  status: VehicleChecklistStatus;
  generatedAt: string;
  notes: string;
}

export interface VeiculosUsoData {
  usages: VehicleUsageRecord[];
}

export function emptyVeiculosUso(): VeiculosUsoData {
  return { usages: [] };
}
