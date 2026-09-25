import { readState, writeState } from "@/lib/store/kv.server";
import {
  emptyContasAReceber,
  RECEIVABLE_METHODS,
  type ContasAReceberData,
  type ReceivableMethod,
  type ReceivableReceipt,
  type ReceivableRecord,
} from "./types";

const KEY = "contas_a_receber";
const FILE = "contas-a-receber.json";

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isMethod(value: unknown): value is ReceivableMethod {
  return RECEIVABLE_METHODS.some((item) => item.key === value);
}

function normalizeReceipt(input: Partial<ReceivableReceipt> | null | undefined): ReceivableReceipt | null {
  if (!input?.id) return null;
  const amount = num(input.amount);
  if (amount <= 0) return null;
  return {
    id: input.id,
    date: typeof input.date === "string" ? input.date.slice(0, 10) : "",
    amount,
    method: isMethod(input.method) ? input.method : "pix",
    note: typeof input.note === "string" ? input.note : "",
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizeReceivable(input: Partial<ReceivableRecord> | null | undefined): ReceivableRecord | null {
  if (!input?.id) return null;
  const amount = num(input.amount);
  if (amount < 0) return null;
  const createdAt = input.createdAt || new Date().toISOString();
  return {
    id: input.id,
    clientId: typeof input.clientId === "string" ? input.clientId : "",
    clientName: typeof input.clientName === "string" ? input.clientName.trim() : "",
    eventId: typeof input.eventId === "string" ? input.eventId : "",
    eventCode: typeof input.eventCode === "string" ? input.eventCode : "",
    eventTitle: typeof input.eventTitle === "string" ? input.eventTitle : "",
    description: typeof input.description === "string" ? input.description.trim() : "",
    amount,
    dueDate: typeof input.dueDate === "string" ? input.dueDate.slice(0, 10) : "",
    canceled: Boolean(input.canceled),
    notes: typeof input.notes === "string" ? input.notes : "",
    receipts: Array.isArray(input.receipts)
      ? input.receipts
          .map((item) => normalizeReceipt(item))
          .filter((item): item is ReceivableReceipt => Boolean(item))
      : [],
    createdAt,
    updatedAt: input.updatedAt || createdAt,
  };
}

function normalize(input: Partial<ContasAReceberData> | null): ContasAReceberData {
  const base = emptyContasAReceber();
  if (!input) return base;
  return {
    receivables: Array.isArray(input.receivables)
      ? input.receivables
          .map((item) => normalizeReceivable(item))
          .filter((item): item is ReceivableRecord => Boolean(item))
      : base.receivables,
  };
}

export async function readContasAReceber(): Promise<ContasAReceberData> {
  return normalize(await readState<Partial<ContasAReceberData>>(KEY, FILE));
}

export async function writeContasAReceber(data: ContasAReceberData): Promise<ContasAReceberData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
