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

export type QuantityFactorStep = {
  baseLabel: string;
  source: string;
  baseValue: number;
  multiplier: number;
  product: number;
};

export type QuantityExplanation = {
  missingProportion: boolean;
  occurrence: number;
  factors: QuantityFactorStep[];
  product: number;
  rounded: number;
};

export interface SeparationComputedItem {
  materialId: string;
  name: string;
  category: string;
  unit: string;
  occurrence: number;
  computedQty: number;
  explanation: QuantityExplanation;
  /** Included from the catalog without being linked to a dish. */
  manual?: boolean;
}

/**
 * Builds the deduplicated material list for an event: the union of materials
 * linked to the event's selected dishes, plus any catalog materials added by
 * hand, each with its calculated quantity.
 */
export function computeSeparationItems(
  cadastros: CadastrosData,
  ctx: EventCalcContext,
  extraMaterialIds: string[] = [],
): SeparationComputedItem[] {
  const occurrences = materialOccurrences(cadastros, ctx.selectedDishIds);
  const extra = new Set(extraMaterialIds);
  const bases = basesMap(cadastros);
  const items: SeparationComputedItem[] = [];

  for (const material of cadastros.materials) {
    const fromDish = occurrences.get(material.id) ?? 0;
    const manual = extra.has(material.id) && fromDish === 0;
    if (!fromDish && !manual) continue;
    const occurrence = fromDish || 1;
    items.push({
      materialId: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      occurrence,
      computedQty: materialQuantity(material, bases, ctx, occurrence),
      explanation: explainMaterialQuantity(material, bases, ctx, occurrence),
      manual,
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

export function describeBaseSource(base: CalcBase): string {
  switch (base.kind.type) {
    case "guests":
      return "convidados do evento";
    case "staff": {
      const staffLabel =
        base.kind.role === "garcons"
          ? "garçons"
          : base.kind.role === "garconetes"
            ? "garçonetes"
            : base.kind.role === "copeiros"
              ? "copeiros(as)"
              : "chefes";
      return `equipe (${staffLabel})`;
    }
    case "islands":
      return "ilhas do evento";
    case "serviceTeam":
      return "garçons + garçonetes";
    case "perGuests":
      return `1 a cada ${base.kind.per} convidados`;
    case "dishes":
      return "pratos do evento que usam este material";
    case "fixed":
      return "quantidade fixa por evento";
    default:
      return "";
  }
}

export function explainMaterialQuantity(
  material: MaterialRecord,
  bases: Map<string, CalcBase>,
  ctx: EventCalcContext,
  occurrence: number,
): QuantityExplanation {
  if (!material.factors.length) {
    return { missingProportion: true, occurrence, factors: [], product: 0, rounded: 0 };
  }

  const factors: QuantityFactorStep[] = [];
  let product = 1;
  for (const factor of material.factors) {
    const base = bases.get(factor.baseId);
    const value = base ? baseValue(base, ctx, occurrence) : 0;
    const multiplier = factor.mult || 0;
    const stepProduct = value * multiplier;
    product *= stepProduct;
    factors.push({
      baseLabel: base?.label ?? "Base desconhecida",
      source: base ? describeBaseSource(base) : "",
      baseValue: value,
      multiplier,
      product: stepProduct,
    });
  }

  const rounded = !Number.isFinite(product) || product <= 0 ? 0 : Math.ceil(product);
  return { missingProportion: false, occurrence, factors, product, rounded };
}
