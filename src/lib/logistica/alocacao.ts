import { isoDaysInRange } from "@/lib/dates";
import { computeSeparationItems, eventCalcContext } from "@/lib/cadastros/calc";
import { kitItemTotal, kitQuantity } from "@/lib/cadastros/kits";
import type { CadastrosData, MaterialRecord } from "@/lib/cadastros/types";
import { materialTotal } from "@/lib/logistica/calc";
import {
  normalizeMaterialSeparation,
  type EventRecord,
} from "@/lib/types";

export interface AllocationWindow {
  start: string;
  end: string;
  assumedDelivery: boolean;
  assumedPickup: boolean;
}

export interface EventNeed {
  materialId: string;
  qty: number;
}

export interface OccupyingEvent {
  id: string;
  title: string;
  code: string;
  status: EventRecord["status"];
  date: string;
  start: string;
  end: string;
  assumedDelivery: boolean;
  assumedPickup: boolean;
  needs: EventNeed[];
}

export interface DayEventQty {
  id: string;
  title: string;
  code: string;
  qty: number;
}

export interface MaterialDayCell {
  demand: number;
  stock: number;
  shortage: number;
  events: DayEventQty[];
}

export interface MaterialWeekRow {
  materialId: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  peak: number;
  shortage: number;
  days: MaterialDayCell[];
}

export interface AllocationWeek {
  days: string[];
  events: OccupyingEvent[];
  materials: MaterialWeekRow[];
  ruptures: MaterialWeekRow[];
  missingDates: OccupyingEvent[];
}

export function allocationWindow(event: EventRecord): AllocationWindow | null {
  if (event.status === "cancelado") return null;
  const eventDay = (event.date || "").slice(0, 10);
  if (!eventDay && !event.materialDeliveryDate && !event.materialPickupDate) return null;
  const assumedDelivery = !event.materialDeliveryDate;
  const assumedPickup = !event.materialPickupDate;
  const start = event.materialDeliveryDate || eventDay;
  let end = event.materialPickupDate || eventDay || start;
  if (!start) return null;
  if (end < start) end = start;
  return { start, end, assumedDelivery, assumedPickup };
}

export function windowOverlaps(start: string, end: string, from: string, to: string) {
  return start <= to && from <= end;
}

export function dateInWindow(day: string, start: string, end: string) {
  return day >= start && day <= end;
}

/** Quantidades que saem para o evento (pratos, extras de catálogo e kits). */
export function eventMaterialNeeds(event: EventRecord, cadastros: CadastrosData): EventNeed[] {
  const sep = normalizeMaterialSeparation(event.materialSeparation);
  const ctx = eventCalcContext(event, cadastros);
  const computed = computeSeparationItems(cadastros, ctx, sep.addedMaterialIds ?? []);
  const qty = new Map<string, number>();
  const add = (materialId: string, amount: number) => {
    if (!materialId || !Number.isFinite(amount) || amount <= 0) return;
    qty.set(materialId, (qty.get(materialId) ?? 0) + amount);
  };

  for (const item of computed) {
    if (sep.overrides[item.materialId]?.removed) continue;
    add(item.materialId, sep.overrides[item.materialId]?.quantity ?? item.computedQty);
  }

  for (const kit of cadastros.kits ?? []) {
    const kitQty = kitQuantity(kit, event, sep, cadastros);
    for (const item of kit.items) {
      add(
        item.materialId,
        kitItemTotal(kit, item.materialId, item.qtyPerKit, kitQty, sep.kits?.[kit.id]),
      );
    }
  }

  return [...qty.entries()].map(([materialId, need]) => ({ materialId, qty: need }));
}

export function clipBarToWeek(
  start: string,
  end: string,
  days: string[],
): { col: number; span: number } | null {
  if (days.length === 0) return null;
  const first = days[0];
  const last = days[days.length - 1];
  if (end < first || start > last) return null;
  const from = start < first ? first : start;
  const to = end > last ? last : end;
  const col = days.indexOf(from);
  const lastCol = days.indexOf(to);
  if (col < 0 || lastCol < 0) return null;
  return { col: col + 1, span: lastCol - col + 1 };
}

export function emptyAllocationWeek(days: string[]): AllocationWeek {
  return { days, events: [], materials: [], ruptures: [], missingDates: [] };
}

export function buildAllocationWeek(
  events: EventRecord[],
  cadastros: CadastrosData,
  balances: Map<string, number>,
  days: string[],
): AllocationWeek {
  const from = days[0] ?? "";
  const to = days[days.length - 1] ?? "";
  const occupying: OccupyingEvent[] = [];

  for (const event of events) {
    const window = allocationWindow(event);
    if (!window) continue;
    if (!windowOverlaps(window.start, window.end, from, to)) continue;
    occupying.push({
      id: event.id,
      title: event.title || event.code || "Evento",
      code: event.code,
      status: event.status,
      date: event.date,
      start: window.start,
      end: window.end,
      assumedDelivery: window.assumedDelivery,
      assumedPickup: window.assumedPickup,
      needs: eventMaterialNeeds(event, cadastros),
    });
  }

  occupying.sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, "pt-BR"),
  );

  const materialById = new Map(cadastros.materials.map((item) => [item.id, item]));
  const usedIds = new Set<string>();
  for (const event of occupying) {
    for (const need of event.needs) usedIds.add(need.materialId);
  }

  const materials: MaterialWeekRow[] = [...usedIds]
    .map((materialId) => {
      const material: MaterialRecord | undefined = materialById.get(materialId);
      const stock = materialTotal(balances, materialId);
      const dayCells: MaterialDayCell[] = days.map((day) => {
        const eventsOnDay: DayEventQty[] = [];
        let demand = 0;
        for (const event of occupying) {
          if (!dateInWindow(day, event.start, event.end)) continue;
          const qty = event.needs.find((need) => need.materialId === materialId)?.qty ?? 0;
          if (qty <= 0) continue;
          demand += qty;
          eventsOnDay.push({ id: event.id, title: event.title, code: event.code, qty });
        }
        const shortage = Math.max(0, demand - stock);
        return { demand, stock, shortage, events: eventsOnDay };
      });
      const peak = dayCells.reduce((max, cell) => Math.max(max, cell.demand), 0);
      const shortage = dayCells.reduce((max, cell) => Math.max(max, cell.shortage), 0);
      return {
        materialId,
        name: material?.name ?? materialId,
        category: material?.category ?? "Outros",
        unit: material?.unit ?? "",
        stock,
        peak,
        shortage,
        days: dayCells,
      };
    })
    .sort(
      (a, b) =>
        b.shortage - a.shortage ||
        a.category.localeCompare(b.category, "pt-BR") ||
        a.name.localeCompare(b.name, "pt-BR"),
    );

  return {
    days,
    events: occupying,
    materials,
    ruptures: materials.filter((row) => row.shortage > 0),
    missingDates: occupying.filter((event) => event.assumedDelivery || event.assumedPickup),
  };
}

export interface EventRupture {
  materialId: string;
  name: string;
  unit: string;
  stock: number;
  peak: number;
  shortage: number;
  thisEventQty: number;
  others: { id: string; title: string; qty: number }[];
}

/** Rupturas na janela deste evento (entrega → recolhimento), considerando os simultâneos. */
export function rupturesForEvent(
  event: EventRecord,
  allEvents: EventRecord[],
  cadastros: CadastrosData,
  balances: Map<string, number>,
): EventRupture[] {
  const window = allocationWindow(event);
  if (!window) return [];
  const days = isoDaysInRange(window.start, window.end);
  const events = allEvents.map((item) => (item.id === event.id ? event : item));
  const allocation = buildAllocationWeek(events, cadastros, balances, days);
  return allocation.ruptures
    .filter((row) => row.days.some((cell) => cell.events.some((item) => item.id === event.id)))
    .map((row) => {
      let thisEventQty = 0;
      const others = new Map<string, { id: string; title: string; qty: number }>();
      for (const cell of row.days) {
        const mine = cell.events.find((item) => item.id === event.id);
        if (mine) thisEventQty = Math.max(thisEventQty, mine.qty);
        if (cell.shortage <= 0) continue;
        for (const item of cell.events) {
          if (item.id === event.id) continue;
          const prev = others.get(item.id);
          if (!prev || item.qty > prev.qty) {
            others.set(item.id, { id: item.id, title: item.title, qty: item.qty });
          }
        }
      }
      return {
        materialId: row.materialId,
        name: row.name,
        unit: row.unit,
        stock: row.stock,
        peak: row.peak,
        shortage: row.shortage,
        thisEventQty,
        others: [...others.values()],
      };
    });
}

export function eventsWithRupture(
  events: EventRecord[],
  cadastros: CadastrosData,
  balances: Map<string, number>,
): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if (rupturesForEvent(event, events, cadastros, balances).length > 0) ids.add(event.id);
  }
  return ids;
}
