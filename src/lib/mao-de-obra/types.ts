import { extraStaffLabel, PICKABLE_EXTRA_STAFF_ROLES, STAFF_ROLES } from "@/lib/types";

export const LABOR_CONTA_AZUL_CATEGORY = "mão de obra externa";

export const LABOR_FUNCTIONS: { key: string; label: string }[] = [
  ...STAFF_ROLES.map((role) => ({ key: role.key, label: role.label })),
  ...PICKABLE_EXTRA_STAFF_ROLES.map((role) => ({ key: role.key, label: role.label })),
];

export function laborFunctionLabel(key: string) {
  return LABOR_FUNCTIONS.find((role) => role.key === key)?.label ?? extraStaffLabel(key);
}

export interface ExternalWorker {
  id: string;
  name: string;
  cpf: string;
  pix: string;
  bankAccount: string;
  functionKey: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaborRate {
  functionKey: string;
  daily: number;
  overtimeHourly: number;
  allowance: number;
}

export type LaborPaymentStatus = "aberto" | "exportado" | "pago";

export interface LaborPayment {
  id: string;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  eventDate: string;
  workerId: string;
  workerName: string;
  workerCpf: string;
  pix: string;
  functionKey: string;
  functionLabel: string;
  daily: number;
  overtimeHours: number;
  overtimeAmount: number;
  allowance: number;
  total: number;
  status: LaborPaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaoDeObraData {
  workers: ExternalWorker[];
  rates: LaborRate[];
  payments: LaborPayment[];
}

export const DEFAULT_LABOR_RATES: LaborRate[] = LABOR_FUNCTIONS.map((role) => ({
  functionKey: role.key,
  daily: role.key.includes("gerente") ? 350 : role.key.includes("chef") ? 280 : 180,
  overtimeHourly: role.key.includes("gerente") ? 45 : 25,
  allowance: 80,
}));

export function emptyMaoDeObra(): MaoDeObraData {
  return { workers: [], rates: DEFAULT_LABOR_RATES, payments: [] };
}
