import { readState, writeState } from "@/lib/store/kv.server";
import { normalizeVariant } from "./calc";
import {
  emptyLogisticaData,
  isMaterialLossReason,
  type EventMaterialControl,
  type EventMaterialControlItem,
  type InventoryItem,
  type InventorySession,
  type InventorySkip,
  type LogisticaData,
  type StockMovement,
} from "./types";

const KEY = "logistica";
const FILE = "logistica.json";

function normalizeMovement(input: Partial<StockMovement> | null | undefined): StockMovement | null {
  if (!input?.id || !input.materialId) return null;
  return {
    id: input.id,
    materialId: input.materialId,
    variant: normalizeVariant(input.variant),
    type: input.type ?? "ajuste",
    quantity: Number(input.quantity) || 0,
    date: input.date || new Date().toISOString(),
    note: input.note,
    ref: input.ref,
  };
}

function normalizeInventoryItem(input: Partial<InventoryItem> | null | undefined): InventoryItem | null {
  if (!input?.materialId) return null;
  return {
    materialId: input.materialId,
    variant: normalizeVariant(input.variant),
    previous: Number(input.previous) || 0,
    counted: Number(input.counted) || 0,
  };
}

function normalizeInventorySkip(input: Partial<InventorySkip> | null | undefined): InventorySkip | null {
  if (!input?.materialId) return null;
  return {
    materialId: input.materialId,
    variant: normalizeVariant(input.variant),
  };
}

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
    items: Array.isArray(input.items)
      ? input.items
          .map((item) => normalizeInventoryItem(item))
          .filter((item): item is InventoryItem => Boolean(item))
      : [],
    skipped: Array.isArray(input.skipped)
      ? input.skipped
          .map((item) => normalizeInventorySkip(item))
          .filter((item): item is InventorySkip => Boolean(item))
      : [],
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeControlItem(input: Partial<EventMaterialControlItem> | null | undefined): EventMaterialControlItem | null {
  if (!input?.materialId) return null;
  return {
    materialId: input.materialId,
    planned: Math.max(0, num(input.planned)),
    sent: Math.max(0, num(input.sent)),
    returned: Math.max(0, num(input.returned)),
    reason: isMaterialLossReason(input.reason) ? input.reason : "",
    note: typeof input.note === "string" ? input.note : "",
  };
}

function normalizeEventControl(input: Partial<EventMaterialControl> | null | undefined): EventMaterialControl | null {
  if (!input?.id || !input.eventId) return null;
  return {
    id: input.id,
    eventId: input.eventId,
    eventTitle: typeof input.eventTitle === "string" ? input.eventTitle : "",
    eventCode: typeof input.eventCode === "string" ? input.eventCode : "",
    eventDate: typeof input.eventDate === "string" ? input.eventDate.slice(0, 10) : "",
    status: input.status === "conferido" ? "conferido" : "rascunho",
    items: Array.isArray(input.items)
      ? input.items
          .map((item) => normalizeControlItem(item))
          .filter((item): item is EventMaterialControlItem => Boolean(item))
      : [],
    note: typeof input.note === "string" ? input.note : "",
    updatedAt: input.updatedAt || new Date().toISOString(),
    concludedAt: typeof input.concludedAt === "string" ? input.concludedAt : undefined,
  };
}

function normalize(input: Partial<LogisticaData> | null): LogisticaData {
  const base = emptyLogisticaData();
  if (!input) return base;
  return {
    movements: Array.isArray(input.movements)
      ? input.movements
          .map((movement) => normalizeMovement(movement))
          .filter((movement): movement is StockMovement => Boolean(movement))
      : base.movements,
    meta: Array.isArray(input.meta) ? input.meta : base.meta,
    inventories: Array.isArray(input.inventories)
      ? input.inventories
          .map((session) => normalizeInventory(session))
          .filter((session): session is InventorySession => Boolean(session))
      : base.inventories,
    eventControls: Array.isArray(input.eventControls)
      ? input.eventControls
          .map((item) => normalizeEventControl(item))
          .filter((item): item is EventMaterialControl => Boolean(item))
      : base.eventControls,
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
