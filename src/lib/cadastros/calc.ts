import { guestTotal, type EventRecord } from "@/lib/types";
import type { CadastrosData, CalcBase, MaterialRecord } from "./types";

export interface EventCalcContext {
  convidados: number;
  garcons: number;
  garconetes: number;
  copeiros: number;
  chefes: number;
  ilhas: number;
  selectedDishIds: string[];
}

export function eventCalcContext(event: EventRecord): EventCalcContext {
  return {
    convidados: guestTotal(event.guests),
    garcons: event.staff.garcons || 0,
    garconetes: event.staff.garconetes || 0,
    copeiros: event.staff.copeiros || 0,
    chefes: event.staff.chefes || 0,
    ilhas: event.islands || 0,
    selectedDishIds: event.selectedDishIds ?? [],
  };
}

/** Value of a single base for a given event and material occurrence count. */
export function baseValue(base: CalcBase, ctx: EventCalcContext, occurrence: number): number {
  const kind = base.kind;
  switch (kind.type) {
    case "guests":
      return ctx.convidados;
    case "staff":
      return ctx[kind.role] || 0;
    case "islands":
      return ctx.ilhas;
    case "serviceTeam":
      return ctx.garcons + ctx.garconetes;
    case "perGuests":
      return kind.per > 0 ? Math.ceil(ctx.convidados / kind.per) : 0;
    case "dishes":
      return occurrence;
    case "fixed":
      return 1;
    default:
      return 0;
  }
}

/**
 * Material quantity = product of every `base × mult` factor, rounded up.
 * We never work with fractional units — always round up.
 */
export function materialQuantity(
  material: MaterialRecord,
  bases: Map<string, CalcBase>,
  ctx: EventCalcContext,
  occurrence: number,
): number {
  if (!material.factors.length) return 0;
  let product = 1;
  for (const factor of material.factors) {
    const base = bases.get(factor.baseId);
    if (!base) return 0;
    product *= baseValue(base, ctx, occurrence) * (factor.mult || 0);
  }
  if (!Number.isFinite(product) || product <= 0) return 0;
  return Math.ceil(product);
}

export function basesMap(cadastros: CadastrosData): Map<string, CalcBase> {
  return new Map(cadastros.bases.map((base) => [base.id, base]));
}

/** How many of the event's selected dishes reference each material. */
export function materialOccurrences(
  cadastros: CadastrosData,
  selectedDishIds: string[],
): Map<string, number> {
  const selected = new Set(selectedDishIds);
  const counts = new Map<string, number>();
  for (const dish of cadastros.dishes) {
    if (!selected.has(dish.id)) continue;
    for (const materialId of dish.materialIds) {
      counts.set(materialId, (counts.get(materialId) ?? 0) + 1);
    }
  }
  return counts;
}

export interface SeparationComputedItem {
  materialId: string;
  name: string;
  category: string;
  unit: string;
  occurrence: number;
  computedQty: number;
}

/**
 * Builds the deduplicated material list for an event: the union of materials
 * linked to the event's selected dishes, each with its calculated quantity.
 */
export function computeSeparationItems(
  cadastros: CadastrosData,
  ctx: EventCalcContext,
): SeparationComputedItem[] {
  const occurrences = materialOccurrences(cadastros, ctx.selectedDishIds);
  const bases = basesMap(cadastros);
  const items: SeparationComputedItem[] = [];

  for (const material of cadastros.materials) {
    const occurrence = occurrences.get(material.id);
    if (!occurrence) continue; // material not used by any selected dish
    items.push({
      materialId: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      occurrence,
      computedQty: materialQuantity(material, bases, ctx, occurrence),
    });
  }

  return items.sort(
    (a, b) => a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
  );
}

export interface SeparationWarning {
  field: string;
  label: string;
}

/** Fields the operation considers essential before separating materials. */
export function separationWarnings(ctx: EventCalcContext): SeparationWarning[] {
  const warnings: SeparationWarning[] = [];
  if (ctx.convidados <= 0) warnings.push({ field: "convidados", label: "Convidados" });
  const teamTotal = ctx.garcons + ctx.garconetes + ctx.copeiros + ctx.chefes;
  if (teamTotal <= 0)
    warnings.push({ field: "equipe", label: "Equipe (garçons, garçonetes, copeiras, chefes)" });
  if (ctx.ilhas <= 0) warnings.push({ field: "ilhas", label: "Ilhas" });
  if (ctx.selectedDishIds.length === 0)
    warnings.push({ field: "pratos", label: "Pratos do cardápio do evento" });
  return warnings;
}

/** Human-readable summary of a material's proportion formula. */
export function describeProportion(
  material: MaterialRecord,
  bases: Map<string, CalcBase>,
): string {
  if (!material.factors.length) return "Sem proporção definida";
  return material.factors
    .map((factor) => {
      const base = bases.get(factor.baseId);
      const label = base ? base.label : "?";
      return `${label} × ${formatMult(factor.mult)}`;
    })
    .join("  ×  ");
}

function formatMult(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
