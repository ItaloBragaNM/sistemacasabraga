export type MovementType = "entrada" | "saida" | "ajuste" | "inventario" | "perda";

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  inventario: "Inventário",
  perda: "Perda",
};

export interface StockMovement {
  id: string;
  materialId: string;
  /** Variação contada (vazia = material sem variação ou saldo ainda não classificado). */
  variant?: string;
  type: MovementType;
  /** Delta com sinal: entrada (+), saída (−), ajuste/inventário (com sinal). */
  quantity: number;
  date: string;
  note?: string;
  /** Referência opcional (ex.: id do evento na baixa, id do inventário). */
  ref?: string;
}

export interface StockMeta {
  materialId: string;
  min: number;
  location: string;
}

export interface InventoryItem {
  materialId: string;
  /** Variação contada (vazia = material sem variação). */
  variant?: string;
  previous: number;
  counted: number;
}

export interface InventorySkip {
  materialId: string;
  variant?: string;
}

export interface InventorySession {
  id: string;
  /** Data da contagem (YYYY-MM-DD). */
  date: string;
  responsible: string;
  /** Quem participou da contagem além do responsável. */
  participants: string[];
  note: string;
  items: InventoryItem[];
  /** SKUs deixados de fora desta contagem (não geram movimento de estoque). */
  skipped: InventorySkip[];
  createdAt: string;
}

export const MATERIAL_LOSS_REASONS = [
  { key: "quebra", label: "Quebra / avaria" },
  { key: "extravio", label: "Extravio" },
  { key: "consumo", label: "Consumo / descartável" },
  { key: "dano", label: "Dano no transporte" },
  { key: "outro", label: "Outro" },
] as const;

export type MaterialLossReason = (typeof MATERIAL_LOSS_REASONS)[number]["key"];

export function isMaterialLossReason(value: unknown): value is MaterialLossReason {
  return MATERIAL_LOSS_REASONS.some((item) => item.key === value);
}

export function materialLossReasonLabel(key: string) {
  return MATERIAL_LOSS_REASONS.find((item) => item.key === key)?.label ?? key;
}

export type EventMaterialControlStatus = "rascunho" | "conferido";

export interface EventMaterialControlItem {
  materialId: string;
  planned: number;
  sent: number;
  returned: number;
  reason: MaterialLossReason | "";
  note: string;
}

export interface EventMaterialControl {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCode: string;
  eventDate: string;
  status: EventMaterialControlStatus;
  items: EventMaterialControlItem[];
  note: string;
  updatedAt: string;
  concludedAt?: string;
}

export interface LogisticaData {
  movements: StockMovement[];
  meta: StockMeta[];
  inventories: InventorySession[];
  eventControls: EventMaterialControl[];
}

export function emptyLogisticaData(): LogisticaData {
  return { movements: [], meta: [], inventories: [], eventControls: [] };
}
