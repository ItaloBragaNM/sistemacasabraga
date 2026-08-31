export type MovementType = "entrada" | "saida" | "ajuste" | "inventario";

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  inventario: "Inventário",
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

export interface InventorySession {
  id: string;
  /** Data da contagem (YYYY-MM-DD). */
  date: string;
  responsible: string;
  /** Quem participou da contagem além do responsável. */
  participants: string[];
  note: string;
  items: InventoryItem[];
  createdAt: string;
}

export interface LogisticaData {
  movements: StockMovement[];
  meta: StockMeta[];
  inventories: InventorySession[];
}

export function emptyLogisticaData(): LogisticaData {
  return { movements: [], meta: [], inventories: [] };
}
