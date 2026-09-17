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

/** Controle de uso: um PDF de entrada/saída por veículo em um evento. */
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
