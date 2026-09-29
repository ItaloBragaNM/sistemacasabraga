export type InsumoMovementType = "entrada" | "saida" | "ajuste" | "perda" | "inventario";

export const INSUMO_MOVEMENT_LABELS: Record<InsumoMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  perda: "Perda",
  inventario: "Inventário",
};

export interface InsumoMovement {
  id: string;
  insumoId: string;
  type: InsumoMovementType;
  /** Delta com sinal: + entrada, − saída/perda. */
  quantity: number;
  date: string;
  note?: string;
  /** Referência a uma perda registrada (loss.id). */
  ref?: string;
}

export type InsumoMinSource = "calculo" | "manual";

export interface InsumoMeta {
  insumoId: string;
  /** Ponto de pedido. No modo cálculo, espelha consumo médio × tempo de reposição. */
  min: number;
  /** Dias que o fornecedor leva para repor. */
  leadDays: number;
  minSource: InsumoMinSource;
  /** Perecível entra na contagem semanal; o restante, na mensal. */
  perishable: boolean;
}

export type InsumoInventoryScope = "semanal" | "mensal";

export const INSUMO_INVENTORY_SCOPE_LABELS: Record<InsumoInventoryScope, string> = {
  semanal: "Perecíveis",
  mensal: "Demais insumos",
};

export interface InsumoInventoryItem {
  insumoId: string;
  previous: number;
  counted: number;
}

export interface InsumoInventorySession {
  id: string;
  date: string;
  scope: InsumoInventoryScope;
  responsible: string;
  note: string;
  items: InsumoInventoryItem[];
  createdAt: string;
}

export const LOSS_REASONS = [
  { key: "validade", label: "Vencimento / validade" },
  { key: "quebra", label: "Quebra / avaria" },
  { key: "preparo", label: "Perda de preparo" },
  { key: "sobra", label: "Sobra descartada" },
  { key: "outro", label: "Outro" },
] as const;

export type LossReasonKey = (typeof LOSS_REASONS)[number]["key"];

export function lossReasonLabel(key: string) {
  return LOSS_REASONS.find((item) => item.key === key)?.label ?? key;
}

export interface InsumoLoss {
  id: string;
  insumoId: string;
  quantity: number;
  reason: LossReasonKey | string;
  note: string;
  date: string;
  /** Custo unitário no momento da perda (snapshot). */
  unitCost: number;
  createdAt: string;
}

export interface CozinhaInsumosData {
  movements: InsumoMovement[];
  meta: InsumoMeta[];
  losses: InsumoLoss[];
  inventories: InsumoInventorySession[];
}

export function emptyCozinhaInsumos(): CozinhaInsumosData {
  return { movements: [], meta: [], losses: [], inventories: [] };
}
