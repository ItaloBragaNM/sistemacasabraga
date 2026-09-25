export const RECEIVABLE_METHODS = [
  { key: "pix", label: "PIX" },
  { key: "transferencia", label: "Transferência" },
  { key: "boleto", label: "Boleto" },
  { key: "cartao", label: "Cartão" },
  { key: "dinheiro", label: "Dinheiro" },
  { key: "outros", label: "Outros" },
] as const;

export type ReceivableMethod = (typeof RECEIVABLE_METHODS)[number]["key"];

export const RECEIVABLE_STATUSES = ["aberto", "parcial", "pago", "vencido", "cancelado"] as const;
export type ReceivableStatus = (typeof RECEIVABLE_STATUSES)[number];

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  aberto: "Em aberto",
  parcial: "Parcial",
  pago: "Recebido",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export interface ReceivableReceipt {
  id: string;
  date: string;
  amount: number;
  method: ReceivableMethod;
  note: string;
  createdAt: string;
}

export interface ReceivableRecord {
  id: string;
  clientId: string;
  clientName: string;
  eventId: string;
  eventCode: string;
  eventTitle: string;
  description: string;
  amount: number;
  dueDate: string;
  canceled: boolean;
  notes: string;
  receipts: ReceivableReceipt[];
  createdAt: string;
  updatedAt: string;
}

export interface ContasAReceberData {
  receivables: ReceivableRecord[];
}

export function emptyContasAReceber(): ContasAReceberData {
  return { receivables: [] };
}

export function receivableMethodLabel(key: string) {
  return RECEIVABLE_METHODS.find((item) => item.key === key)?.label ?? key;
}
