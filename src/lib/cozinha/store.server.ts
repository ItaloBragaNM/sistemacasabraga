import { readStoreState, saveStoreState } from "@/lib/store/cas.server";
import { readState, writeState } from "@/lib/store/kv.server";
import {
  emptyCozinhaInsumos,
  type CozinhaInsumosData,
  type InsumoInventoryItem,
  type InsumoInventorySession,
  type InsumoLoss,
  type InsumoMeta,
  type InsumoMovement,
} from "./types";

const KEY = "cozinha_insumos";
const FILE = "cozinha-insumos.json";

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMovement(input: Partial<InsumoMovement> | null | undefined): InsumoMovement | null {
  if (!input?.id || !input.insumoId) return null;
  const type =
    input.type === "entrada" ||
    input.type === "saida" ||
    input.type === "ajuste" ||
    input.type === "perda" ||
    input.type === "inventario"
      ? input.type
      : "ajuste";
  return {
    id: input.id,
    insumoId: input.insumoId,
    type,
    quantity: num(input.quantity),
    date: input.date || new Date().toISOString(),
    note: typeof input.note === "string" ? input.note : "",
    ref: typeof input.ref === "string" ? input.ref : undefined,
  };
}

function normalizeMeta(input: Partial<InsumoMeta> | null | undefined): InsumoMeta | null {
  if (!input?.insumoId) return null;
  const min = Math.max(0, num(input.min));
  const minSource =
    input.minSource === "manual" || input.minSource === "calculo"
      ? input.minSource
      : min > 0
        ? "manual"
        : "calculo";
  return {
    insumoId: input.insumoId,
    min,
    leadDays: Math.max(0, Math.round(num(input.leadDays))),
    minSource,
    perishable: input.perishable === true,
  };
}

function normalizeInventoryItem(input: Partial<InsumoInventoryItem> | null | undefined): InsumoInventoryItem | null {
  if (!input?.insumoId) return null;
  return {
    insumoId: input.insumoId,
    previous: num(input.previous),
    counted: Math.max(0, num(input.counted)),
  };
}

function normalizeInventory(input: Partial<InsumoInventorySession> | null | undefined): InsumoInventorySession | null {
  if (!input?.id) return null;
  return {
    id: input.id,
    date: (input.date || new Date().toISOString()).slice(0, 10),
    scope: input.scope === "semanal" ? "semanal" : "mensal",
    responsible: typeof input.responsible === "string" ? input.responsible : "",
    note: typeof input.note === "string" ? input.note : "",
    items: Array.isArray(input.items)
      ? input.items
          .map((item) => normalizeInventoryItem(item))
          .filter((item): item is InsumoInventoryItem => Boolean(item))
      : [],
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizeLoss(input: Partial<InsumoLoss> | null | undefined): InsumoLoss | null {
  if (!input?.id || !input.insumoId) return null;
  return {
    id: input.id,
    insumoId: input.insumoId,
    quantity: Math.abs(num(input.quantity)),
    reason: typeof input.reason === "string" ? input.reason : "outro",
    note: typeof input.note === "string" ? input.note : "",
    date: input.date || new Date().toISOString().slice(0, 10),
    unitCost: num(input.unitCost),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalize(input: Partial<CozinhaInsumosData> | null): CozinhaInsumosData {
  const base = emptyCozinhaInsumos();
  if (!input) return base;
  return {
    movements: Array.isArray(input.movements)
      ? input.movements.map((item) => normalizeMovement(item)).filter((item): item is InsumoMovement => Boolean(item))
      : base.movements,
    meta: Array.isArray(input.meta)
      ? input.meta.map((item) => normalizeMeta(item)).filter((item): item is InsumoMeta => Boolean(item))
      : base.meta,
    losses: Array.isArray(input.losses)
      ? input.losses.map((item) => normalizeLoss(item)).filter((item): item is InsumoLoss => Boolean(item))
      : base.losses,
    inventories: Array.isArray(input.inventories)
      ? input.inventories
          .map((item) => normalizeInventory(item))
          .filter((item): item is InsumoInventorySession => Boolean(item))
      : base.inventories,
  };
}

export async function readCozinhaInsumos(): Promise<CozinhaInsumosData> {
  return normalize(await readState<Partial<CozinhaInsumosData>>(KEY, FILE));
}

export async function writeCozinhaInsumos(data: CozinhaInsumosData): Promise<CozinhaInsumosData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}

function revive(raw: unknown) {
  return normalize((raw ?? null) as Partial<CozinhaInsumosData> | null);
}

export async function readCozinhaInsumosState() {
  return readStoreState(KEY, FILE, revive);
}

export async function saveCozinhaInsumos(data: CozinhaInsumosData, expectedUpdatedAt: string | null) {
  const normalized = normalize(data);
  return saveStoreState(KEY, FILE, normalized, expectedUpdatedAt, revive);
}
