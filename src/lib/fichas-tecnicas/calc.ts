import type { RecipeIngredient, TechnicalSheet } from "./types";

export function adjustedQuantity(ingredient: Pick<RecipeIngredient, "netQuantity" | "yieldPercent">) {
  const yieldPercent = ingredient.yieldPercent > 0 ? ingredient.yieldPercent : 100;
  return ingredient.netQuantity / (yieldPercent / 100);
}

export function ingredientTotal(ingredient: RecipeIngredient) {
  return adjustedQuantity(ingredient) * (ingredient.unitCost || 0);
}

export function recipeCost(sheet: Pick<TechnicalSheet, "ingredients">) {
  return sheet.ingredients.reduce((sum, item) => sum + ingredientTotal(item), 0);
}

export function costPerPortion(sheet: TechnicalSheet) {
  const portions = sheet.yieldPortions > 0 ? sheet.yieldPortions : 0;
  if (!portions) return 0;
  return recipeCost(sheet) / portions;
}

export function projectedCmv(sheet: TechnicalSheet) {
  if (!sheet.salePrice) return 0;
  return (recipeCost(sheet) / sheet.salePrice) * 100;
}
