import { readState, writeState } from "@/lib/store/kv.server";
import { emptyVeiculosUso, type VehicleUsageRecord, type VeiculosUsoData } from "./types";

const KEY = "veiculos_uso";
const FILE = "veiculos-uso.json";

function normalizeUsage(input: Partial<VehicleUsageRecord> | null | undefined): VehicleUsageRecord | null {
  if (!input?.id || !input.eventId || !input.vehicleId) return null;
  return {
    id: input.id,
    eventId: input.eventId,
    vehicleId: input.vehicleId,
    status: input.status === "assinado" ? "assinado" : "gerado",
    generatedAt: input.generatedAt || new Date().toISOString(),
    notes: typeof input.notes === "string" ? input.notes : "",
  };
}

function normalize(input: Partial<VeiculosUsoData> | null): VeiculosUsoData {
  const base = emptyVeiculosUso();
  if (!input) return base;
  return {
    usages: Array.isArray(input.usages)
      ? input.usages.map((item) => normalizeUsage(item)).filter((item): item is VehicleUsageRecord => Boolean(item))
      : base.usages,
  };
}

export async function readVeiculosUso(): Promise<VeiculosUsoData> {
  return normalize(await readState<Partial<VeiculosUsoData>>(KEY, FILE));
}

export async function writeVeiculosUso(data: VeiculosUsoData): Promise<VeiculosUsoData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
