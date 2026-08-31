import { readState, writeState } from "@/lib/store/kv.server";
import { emptyLogisticaData, type InventorySession, type LogisticaData } from "./types";

const KEY = "logistica";
const FILE = "logistica.json";

function normalizeInventory(input: Partial<InventorySession> | null | undefined): InventorySession | null {
  if (!input?.id) return null;
  const date =
    typeof input.date === "string" && input.date
      ? input.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const participants = Array.isArray(input.participants)
    ? input.participants.map((name) => String(name).trim()).filter(Boolean)
    : typeof (input as { participants?: string }).participants === "string"
      ? String((input as { participants?: string }).participants)
          .split(/[,;]/)
          .map((name) => name.trim())
          .filter(Boolean)
      : [];
  return {
    id: input.id,
    date,
    responsible: input.responsible ?? "",
    participants,
    note: input.note ?? "",
    items: Array.isArray(input.items) ? input.items : [],
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalize(input: Partial<LogisticaData> | null): LogisticaData {
  const base = emptyLogisticaData();
  if (!input) return base;
  return {
    movements: Array.isArray(input.movements) ? input.movements : base.movements,
    meta: Array.isArray(input.meta) ? input.meta : base.meta,
    inventories: Array.isArray(input.inventories)
      ? input.inventories
          .map((session) => normalizeInventory(session))
          .filter((session): session is InventorySession => Boolean(session))
      : base.inventories,
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
