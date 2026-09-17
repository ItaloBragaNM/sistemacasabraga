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

export interface TechnicalSheet {
  id: string;
  dishId: string;
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

export function blankTechnicalSheet(id: string): TechnicalSheet {
  const now = new Date().toISOString();
  return {
    id,
    dishId: "",
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
