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
  previous: number;
  counted: number;
}

export interface InventorySession {
  id: string;
  date: string;
  responsible: string;
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
