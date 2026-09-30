import assert from "node:assert/strict";
import { test } from "node:test";
import { menuItem, menuPlanNeedsPerCapita } from "../src/lib/event-factory";
import {
  assignDishSheets,
  dishLinkError,
  dishSheetSlots,
  parseTechnicalSheetKind,
  sheetDishIds,
  sheetsForDish,
  unlinkDishFromSheets,
  type TechnicalSheet,
} from "../src/lib/fichas-tecnicas/types";

function sheet(partial: Partial<TechnicalSheet> & Pick<TechnicalSheet, "id" | "name" | "kind">): TechnicalSheet {
  return {
    dishId: "",
    dishIds: [],
    classification: "",
    sector: "Alimentos e Bebidas",
    portionSize: "",
    yieldWeight: 0,
    yieldPortions: 0,
    yieldWeightUnit: "g",
    salePrice: 0,
    method: "",
    ingredients: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("ficha antiga com dishId vira lista de pratos", () => {
  assert.deepEqual(sheetDishIds({ dishId: "d1", dishIds: [] }), ["d1"]);
  assert.deepEqual(sheetDishIds({ dishId: "d1", dishIds: ["d2", "d2"] }), ["d2"]);
  assert.equal(parseTechnicalSheetKind("recheio"), "recheio");
  assert.equal(parseTechnicalSheetKind("outra"), "completa");
});

test("prato aceita no máximo uma ficha de cada tipo", () => {
  const sheets = [
    sheet({ id: "b1", name: "Massa", kind: "base", dishIds: ["torta"] }),
    sheet({ id: "r1", name: "Doce de leite", kind: "recheio", dishIds: ["torta"] }),
    sheet({ id: "r2", name: "Brigadeiro", kind: "recheio" }),
    sheet({ id: "c1", name: "Torta montada", kind: "completa" }),
  ];
  assert.equal(dishLinkError(sheets, sheets[2], "torta"), "Este prato já tem uma ficha de recheio.");
  assert.equal(dishLinkError(sheets, sheets[3], "torta"), null);

  const linked = assignDishSheets(sheets, "torta", { base: "b1", recheio: "r1", completa: "c1" });
  assert.deepEqual(dishSheetSlots(linked, "torta"), { base: "b1", recheio: "r1", completa: "c1" });
  assert.equal(sheetsForDish(linked, "torta").length, 3);
  assert.equal(dishLinkError(linked, sheet({ id: "x", name: "Extra", kind: "base" }), "torta"), "Este prato já tem 3 fichas técnicas.");
});

test("trocar a ficha de um tipo desvincula a anterior", () => {
  const sheets = [
    sheet({ id: "b1", name: "Massa A", kind: "base", dishIds: ["torta"] }),
    sheet({ id: "b2", name: "Massa B", kind: "base" }),
  ];
  const next = assignDishSheets(sheets, "torta", { base: "b2" });
  assert.deepEqual(sheetDishIds(next[0]), []);
  assert.deepEqual(sheetDishIds(next[1]), ["torta"]);
});

test("excluir o prato limpa os vínculos", () => {
  const sheets = [
    sheet({ id: "b1", name: "Massa", kind: "base", dishIds: ["torta", "bolo"] }),
    sheet({ id: "c1", name: "Montagem", kind: "completa", dishIds: ["torta"] }),
  ];
  const next = unlinkDishFromSheets(sheets, "torta");
  assert.deepEqual(sheetDishIds(next[0]), ["bolo"]);
  assert.deepEqual(sheetDishIds(next[1]), []);
});

test("selecionar prato exige gerar per capita até o cardápio acompanhar", () => {
  const dishes = [{ id: "risoto", name: "Risoto" }];
  const planned = [{ id: "s1", title: "Menu", time: "", items: [menuItem("Risoto", "", "", "risoto")] }];
  assert.equal(menuPlanNeedsPerCapita(["risoto"], dishes, []), true);
  assert.equal(menuPlanNeedsPerCapita(["risoto"], dishes, planned), false);
  assert.equal(menuPlanNeedsPerCapita([], dishes, planned), true);
});
