import { readStoreState, saveStoreState } from "@/lib/store/cas.server";
import { readState, writeState } from "@/lib/store/kv.server";
import {
  emptyContasAReceber,
  RECEIVABLE_CHARGE_KINDS,
  RECEIVABLE_METHODS,
  type ContasAReceberData,
  type ReceivableChange,
  type ReceivableCharge,
  type ReceivableChargeKind,
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

function isKind(value: unknown): value is ReceivableChargeKind {
  return RECEIVABLE_CHARGE_KINDS.some((item) => item.key === value);
}

function monthOf(value: unknown) {
  if (typeof value !== "string") return "";
  const match = value.match(/^(\d{4}-\d{2})/);
  return match?.[1] ?? "";
}

const MAX_ATTACHMENT_CHARS = 2_200_000;

function normalizeReceipt(input: Partial<ReceivableReceipt> | null | undefined): ReceivableReceipt | null {
  if (!input?.id) return null;
  const amount = num(input.amount);
  if (amount <= 0) return null;
  const attachmentDataUrl =
    typeof input.attachmentDataUrl === "string" && input.attachmentDataUrl.length <= MAX_ATTACHMENT_CHARS
      ? input.attachmentDataUrl
      : "";
  return {
    id: input.id,
    date: typeof input.date === "string" ? input.date.slice(0, 10) : "",
    amount,
    method: isMethod(input.method) ? input.method : "pix",
    note: typeof input.note === "string" ? input.note : "",
    attachmentName: attachmentDataUrl && typeof input.attachmentName === "string" ? input.attachmentName : "",
    attachmentDataUrl,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizeCharge(input: Partial<ReceivableCharge> | null | undefined): ReceivableCharge | null {
  if (!input?.id) return null;
  const amount = num(input.amount);
  if (amount <= 0) return null;
  return {
    id: input.id,
    kind: isKind(input.kind) ? input.kind : "extra",
    date: typeof input.date === "string" ? input.date.slice(0, 10) : "",
    description: typeof input.description === "string" ? input.description.trim() : "",
    amount,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function normalizeChange(input: Partial<ReceivableChange> | null | undefined): ReceivableChange | null {
  if (!input?.id || typeof input.summary !== "string" || !input.summary.trim()) return null;
  return {
    id: input.id,
    at: typeof input.at === "string" ? input.at : new Date().toISOString(),
    userId: typeof input.userId === "string" ? input.userId : "",
    userName: typeof input.userName === "string" ? input.userName : "",
    summary: input.summary.trim(),
  };
}

function legacyCharge(input: Partial<ReceivableRecord> & { dueDate?: string }, createdAt: string): ReceivableCharge[] {
  const amount = num(input.amount);
  if (amount <= 0 || !input.id) return [];
  const due = typeof input.dueDate === "string" ? input.dueDate.slice(0, 10) : "";
  return [
    {
      id: `${input.id}-fechamento`,
      kind: "evento",
      date: due || createdAt.slice(0, 10),
      description: typeof input.description === "string" && input.description.trim() ? input.description.trim() : "Fechamento do evento",
      amount,
      createdAt,
    },
  ];
}

function normalizeReceivable(input: Partial<ReceivableRecord> & { dueDate?: string } | null | undefined): ReceivableRecord | null {
  if (!input?.id) return null;
  const createdAt = input.createdAt || new Date().toISOString();
  const charges = Array.isArray(input.charges)
    ? input.charges.map((item) => normalizeCharge(item)).filter((item): item is ReceivableCharge => Boolean(item))
    : [];
  const resolved = charges.length > 0 ? charges : legacyCharge(input, createdAt);
  const amount = resolved.reduce((sum, charge) => sum + charge.amount, 0);
  if (amount < 0) return null;
  return {
    id: input.id,
    clientId: typeof input.clientId === "string" ? input.clientId : "",
    clientName: typeof input.clientName === "string" ? input.clientName.trim() : "",
    eventId: typeof input.eventId === "string" ? input.eventId : "",
    eventCode: typeof input.eventCode === "string" ? input.eventCode : "",
    eventTitle: typeof input.eventTitle === "string" ? input.eventTitle : "",
    description: typeof input.description === "string" ? input.description.trim() : "",
    amount,
    competence: monthOf(input.competence) || monthOf(input.dueDate),
    canceled: Boolean(input.canceled),
    notes: typeof input.notes === "string" ? input.notes : "",
    charges: resolved,
    receipts: Array.isArray(input.receipts)
      ? input.receipts
          .map((item) => normalizeReceipt(item))
          .filter((item): item is ReceivableReceipt => Boolean(item))
      : [],
    changeLog: Array.isArray(input.changeLog)
      ? input.changeLog.map((item) => normalizeChange(item)).filter((item): item is ReceivableChange => Boolean(item))
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

function revive(raw: unknown) {
  return normalize((raw ?? null) as Partial<ContasAReceberData> | null);
}

export async function readContasAReceberState() {
  return readStoreState(KEY, FILE, revive);
}

export async function saveContasAReceber(data: ContasAReceberData, expectedUpdatedAt: string | null) {
  const normalized = normalize(data);
  return saveStoreState(KEY, FILE, normalized, expectedUpdatedAt, revive);
}
