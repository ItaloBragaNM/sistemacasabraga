export const RECIPE_UNITS = ["g", "kg", "ml", "L", "un"] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];

export interface RecipeIngredient {
  id: string;
  insumoId: string;
  name: string;
  brand: string;
  netQuantity: number;
  unit: string;
  yieldPercent: number;
  unitCost: number;
}

export const TECHNICAL_SHEET_KINDS = ["base", "recheio", "completa"] as const;
export type TechnicalSheetKind = (typeof TECHNICAL_SHEET_KINDS)[number];

export const TECHNICAL_SHEET_KIND_LABELS: Record<TechnicalSheetKind, string> = {
  base: "Ficha de base",
  recheio: "Ficha de recheio",
  completa: "Ficha completa",
};

export const TECHNICAL_SHEET_KIND_HINTS: Record<TechnicalSheetKind, string> = {
  base: "Componente estrutural produzido em lote — massa, pão de ló, proteína, arroz.",
  recheio: "Preenchimento ou acompanhamento reutilizável — creme, molho, brigadeiro.",
  completa: "Montagem final: base + recheio + finalização, porcionamento e apresentação.",
};

export const MAX_SHEETS_PER_DISH = 3;

export function isTechnicalSheetKind(value: unknown): value is TechnicalSheetKind {
  return TECHNICAL_SHEET_KINDS.includes(value as TechnicalSheetKind);
}

export function parseTechnicalSheetKind(value: unknown): TechnicalSheetKind {
  return isTechnicalSheetKind(value) ? value : "completa";
}

export function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

/** Pratos que usam esta ficha. Aceita o campo antigo `dishId`. */
export function sheetDishIds(sheet: Pick<TechnicalSheet, "dishIds" | "dishId">) {
  if (Array.isArray(sheet.dishIds) && sheet.dishIds.length > 0) return uniqueIds(sheet.dishIds);
  return sheet.dishId ? [sheet.dishId] : [];
}

export function sheetsForDish(sheets: TechnicalSheet[], dishId: string) {
  if (!dishId) return [];
  return sheets.filter((sheet) => sheetDishIds(sheet).includes(dishId));
}

export function dishSheetSlots(sheets: TechnicalSheet[], dishId: string) {
  const slots: Record<TechnicalSheetKind, string> = { base: "", recheio: "", completa: "" };
  for (const sheet of sheetsForDish(sheets, dishId)) {
    slots[sheet.kind] = sheet.id;
  }
  return slots;
}

export function assignDishSheets(
  sheets: TechnicalSheet[],
  dishId: string,
  slots: Partial<Record<TechnicalSheetKind, string>>,
): TechnicalSheet[] {
  if (!dishId) return sheets;
  return sheets.map((sheet) => {
    const wanted = (slots[sheet.kind] || "") === sheet.id;
    const ids = new Set(sheetDishIds(sheet));
    if (wanted) ids.add(dishId);
    else ids.delete(dishId);
    const dishIds = [...ids];
    return { ...sheet, dishIds, dishId: dishIds[0] ?? "" };
  });
}

export function unlinkDishFromSheets(sheets: TechnicalSheet[], dishId: string) {
  return assignDishSheets(sheets, dishId, {});
}

export function dishLinkError(sheets: TechnicalSheet[], sheet: TechnicalSheet, dishId: string) {
  if (!dishId || sheetDishIds(sheet).includes(dishId)) return null;
  const current = sheetsForDish(sheets, dishId);
  if (current.length >= MAX_SHEETS_PER_DISH) {
    return "Este prato já tem 3 fichas técnicas.";
  }
  if (current.some((item) => item.kind === sheet.kind && item.id !== sheet.id)) {
    return `Este prato já tem uma ${TECHNICAL_SHEET_KIND_LABELS[sheet.kind].toLowerCase()}.`;
  }
  return null;
}

export interface TechnicalSheet {
  id: string;
  kind: TechnicalSheetKind;
  /** @deprecated use dishIds — mantido na leitura de fichas antigas */
  dishId: string;
  dishIds: string[];
  name: string;
  classification: string;
  sector: string;
  portionSize: string;
  yieldWeight: number;
  yieldPortions: number;
  yieldWeightUnit: string;
  salePrice: number;
  method: string;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
}

export interface FichasTecnicasData {
  sheets: TechnicalSheet[];
}

export function emptyFichasTecnicas(): FichasTecnicasData {
  return { sheets: [] };
}

export function blankRecipeIngredient(id: string): RecipeIngredient {
  return {
    id,
    insumoId: "",
    name: "",
    brand: "",
    netQuantity: 0,
    unit: "g",
    yieldPercent: 100,
    unitCost: 0,
  };
}

export function blankTechnicalSheet(id: string, kind: TechnicalSheetKind = "completa"): TechnicalSheet {
  const now = new Date().toISOString();
  return {
    id,
    kind,
    dishId: "",
    dishIds: [],
    name: "",
    classification: "",
    sector: "Alimentos e Bebidas",
    portionSize: "",
    yieldWeight: 0,
    yieldPortions: 0,
    yieldWeightUnit: "g",
    salePrice: 0,
    method: "",
    ingredients: [],
    createdAt: now,
    updatedAt: now,
  };
}
