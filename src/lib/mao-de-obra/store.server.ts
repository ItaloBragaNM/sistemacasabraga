import { readState, writeState } from "@/lib/store/kv.server";
import {
  DEFAULT_LABOR_RATES,
  emptyMaoDeObra,
  type ExternalWorker,
  type LaborPayment,
  type LaborRate,
  type MaoDeObraData,
} from "./types";

const KEY = "mao_de_obra";
const FILE = "mao-de-obra.json";

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeWorker(input: Partial<ExternalWorker> | null | undefined): ExternalWorker | null {
  if (!input?.id || !input.name) return null;
  const functionKeys = Array.isArray(input.functionKeys)
    ? [...new Set(input.functionKeys.filter((key): key is string => typeof key === "string" && Boolean(key)))]
    : input.functionKey
      ? [input.functionKey]
      : [];
  return {
    id: input.id,
    name: input.name.trim(),
    cpf: typeof input.cpf === "string" ? input.cpf : "",
    pix: typeof input.pix === "string" ? input.pix : "",
    bankAccount: typeof input.bankAccount === "string" ? input.bankAccount : "",
    functionKey: functionKeys[0] || (typeof input.functionKey === "string" ? input.functionKey : ""),
    functionKeys,
    notes: typeof input.notes === "string" ? input.notes : "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function normalizeRate(input: Partial<LaborRate> | null | undefined): LaborRate | null {
  if (!input?.functionKey) return null;
  return {
    functionKey: input.functionKey,
    daily: num(input.daily),
    overtimeHourly: num(input.overtimeHourly),
    allowance: num(input.allowance),
  };
}

function normalizePayment(input: Partial<LaborPayment> | null | undefined): LaborPayment | null {
  if (!input?.id || !input.eventId || !input.workerId) return null;
  const status =
    input.status === "pago" || input.status === "exportado" || input.status === "aberto"
      ? input.status
      : "aberto";
  return {
    id: input.id,
    eventId: input.eventId,
    eventCode: input.eventCode ?? "",
    eventTitle: input.eventTitle ?? "",
    eventDate: input.eventDate ?? "",
    workerId: input.workerId,
    workerName: input.workerName ?? "",
    workerCpf: input.workerCpf ?? "",
    pix: input.pix ?? "",
    functionKey: input.functionKey ?? "",
    functionLabel: input.functionLabel ?? "",
    daily: num(input.daily),
    overtimeHours: num(input.overtimeHours),
    overtimeAmount: num(input.overtimeAmount),
    allowance: num(input.allowance),
    total: num(input.total),
    status,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

function mergeRates(stored: LaborRate[]): LaborRate[] {
  const byKey = new Map(stored.map((rate) => [rate.functionKey, rate]));
  for (const fallback of DEFAULT_LABOR_RATES) {
    if (!byKey.has(fallback.functionKey)) byKey.set(fallback.functionKey, fallback);
  }
  return [...byKey.values()];
}

function normalize(input: Partial<MaoDeObraData> | null): MaoDeObraData {
  const base = emptyMaoDeObra();
  if (!input) return base;
  return {
    workers: Array.isArray(input.workers)
      ? input.workers.map((item) => normalizeWorker(item)).filter((item): item is ExternalWorker => Boolean(item))
      : base.workers,
    rates: mergeRates(
      Array.isArray(input.rates)
        ? input.rates.map((item) => normalizeRate(item)).filter((item): item is LaborRate => Boolean(item))
        : base.rates,
    ),
    payments: Array.isArray(input.payments)
      ? input.payments.map((item) => normalizePayment(item)).filter((item): item is LaborPayment => Boolean(item))
      : base.payments,
  };
}

export async function readMaoDeObra(): Promise<MaoDeObraData> {
  return normalize(await readState<Partial<MaoDeObraData>>(KEY, FILE));
}

export async function writeMaoDeObra(data: MaoDeObraData): Promise<MaoDeObraData> {
  const normalized = normalize(data);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
