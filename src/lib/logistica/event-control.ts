import type { CadastrosData, MaterialKind } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { eventMaterialNeeds } from "@/lib/logistica/alocacao";
import {
  isMaterialLossReason,
  type EventMaterialControl,
  type EventMaterialControlItem,
  type MaterialLossReason,
  type StockMovement,
} from "@/lib/logistica/types";
import type { EventRecord } from "@/lib/types";

export function controlLossQty(item: Pick<EventMaterialControlItem, "sent" | "returned">) {
  return Math.max(0, (Number(item.sent) || 0) - (Number(item.returned) || 0));
}

export function defaultReturned(kind: MaterialKind | undefined, planned: number) {
  return kind === "descartavel" ? 0 : planned;
}

export function mergeControlItems(
  event: EventRecord,
  cadastros: CadastrosData,
  saved?: EventMaterialControlItem[],
): EventMaterialControlItem[] {
  const planned = eventMaterialNeeds(event, cadastros);
  const savedMap = new Map((saved ?? []).map((item) => [item.materialId, item]));
  const materialById = new Map(cadastros.materials.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const items: EventMaterialControlItem[] = [];

  for (const need of planned) {
    seen.add(need.materialId);
    const prev = savedMap.get(need.materialId);
    const kind = materialById.get(need.materialId)?.kind;
    items.push({
      materialId: need.materialId,
      planned: need.qty,
      sent: prev?.sent ?? need.qty,
      returned: prev?.returned ?? defaultReturned(kind, need.qty),
      reason: prev?.reason && isMaterialLossReason(prev.reason) ? prev.reason : "",
      note: prev?.note ?? "",
    });
  }

  for (const prev of saved ?? []) {
    if (seen.has(prev.materialId)) continue;
    if ((prev.sent || 0) <= 0 && (prev.returned || 0) <= 0) continue;
    items.push({
      ...prev,
      planned: 0,
      reason: prev.reason && isMaterialLossReason(prev.reason) ? prev.reason : "",
    });
  }

  return items.sort((a, b) => {
    const nameA = materialById.get(a.materialId)?.name ?? "";
    const nameB = materialById.get(b.materialId)?.name ?? "";
    const catA = materialById.get(a.materialId)?.category ?? "";
    const catB = materialById.get(b.materialId)?.category ?? "";
    return catA.localeCompare(catB, "pt-BR") || nameA.localeCompare(nameB, "pt-BR");
  });
}

export function controlSnapshot(
  event: EventRecord,
  cadastros: CadastrosData,
  previous?: EventMaterialControl | null,
): EventMaterialControl {
  const now = new Date().toISOString();
  return {
    id: previous?.id ?? uid(),
    eventId: event.id,
    eventTitle: event.title || event.code || "Evento",
    eventCode: event.code,
    eventDate: (event.date || "").slice(0, 10),
    status: previous?.status === "conferido" ? "conferido" : "rascunho",
    items: mergeControlItems(event, cadastros, previous?.items),
    note: previous?.note ?? "",
    updatedAt: now,
    concludedAt: previous?.concludedAt,
  };
}

export function suggestedLossReason(
  kind: MaterialKind | undefined,
  loss: number,
): MaterialLossReason | "" {
  if (loss <= 0) return "";
  if (kind === "descartavel") return "consumo";
  return "quebra";
}

/** Saída do que foi e entrada do que voltou. A perda fica no saldo (foi − voltou). */
export function stockMovementsFromControl(control: EventMaterialControl): StockMovement[] {
  if (control.status !== "conferido") return [];
  const date = control.eventDate || control.updatedAt.slice(0, 10);
  const label = control.eventCode || control.eventTitle;
  const movements: StockMovement[] = [];
  for (const item of control.items) {
    const sent = Number(item.sent) || 0;
    const returned = Number(item.returned) || 0;
    if (sent > 0) {
      movements.push({
        id: `${control.id}-saiu-${item.materialId}`,
        materialId: item.materialId,
        type: "saida",
        quantity: -sent,
        date,
        note: `Saiu para ${label}`,
        ref: control.id,
      });
    }
    if (returned > 0) {
      movements.push({
        id: `${control.id}-voltou-${item.materialId}`,
        materialId: item.materialId,
        type: "entrada",
        quantity: returned,
        date,
        note: `Voltou de ${label}`,
        ref: control.id,
      });
    }
  }
  return movements;
}
