import { readState, writeState } from "@/lib/store/kv.server";
import { emptyLogisticaData, type LogisticaData } from "./types";

const KEY = "logistica";
const FILE = "logistica.json";

function normalize(input: Partial<LogisticaData> | null): LogisticaData {
  const base = emptyLogisticaData();
  if (!input) return base;
  return {
    movements: Array.isArray(input.movements) ? input.movements : base.movements,
    meta: Array.isArray(input.meta) ? input.meta : base.meta,
    inventories: Array.isArray(input.inventories) ? input.inventories : base.inventories,
  };
}

export async function readLogistica(): Promise<LogisticaData> {
  return normalize(await readState<Partial<LogisticaData>>(KEY, FILE));
}

export async function writeLogistica(data: LogisticaData): Promise<LogisticaData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
