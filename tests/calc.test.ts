import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_BASES } from "../src/lib/cadastros/defaults";
import {
  basesMap,
  computeSeparationItems,
  materialQuantity,
  type EventCalcContext,
} from "../src/lib/cadastros/calc";
import { kitItemComputedTotal, kitItemTotal, suggestedKitQuantity } from "../src/lib/cadastros/kits";
import type { CadastrosData, MaterialKit, MaterialRecord } from "../src/lib/cadastros/types";
import {
  averageDailyConsumption,
  computeInsumoBalances,
  effectiveMinimum,
  suggestedMinimum,
} from "../src/lib/cozinha/calc";
import type { InsumoMeta, InsumoMovement } from "../src/lib/cozinha/types";
import { createBlankEvent } from "../src/lib/event-factory";
import { DEFAULT_DRINK_PREMISES } from "../src/lib/types";
import { contractedAmount, receivableStatus, receivedTotal, remainingAmount } from "../src/lib/financeiro/calc";
import type { ReceivableRecord } from "../src/lib/financeiro/types";
import { allocationWindow, buildAllocationWeek, windowOverlaps } from "../src/lib/logistica/alocacao";
import { controlLossQty, defaultReturned, stockMovementsFromControl } from "../src/lib/logistica/event-control";
import type { EventMaterialControl } from "../src/lib/logistica/types";

const stamp = "2026-01-01T00:00:00.000Z";

function material(partial: Partial<MaterialRecord> & Pick<MaterialRecord, "id" | "name" | "factors">): MaterialRecord {
  return {
    category: "Utensílios Cozinha",
    unit: "un",
    kind: "permanente",
    variants: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...partial,
  };
}

function cadastros(materials: MaterialRecord[], kits: MaterialKit[] = []): CadastrosData {
  return {
    materials,
    dishes: [
      {
        id: "dish-1",
        name: "Arroz",
        category: "Menu",
        materialIds: materials.map((item) => item.id),
        insumoIds: [],
        hasRechaud: false,
        hasFritadeira: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    materialCategories: [],
    dishCategories: [],
    bases: DEFAULT_BASES,
    insumos: [],
    insumoCategories: [],
    clientes: [],
    veiculos: [],
    kits,
    extras: [],
    stockLocations: [],
    drinkPremises: { ...DEFAULT_DRINK_PREMISES },
  };
}

const ctx: EventCalcContext = {
  convidados: 100,
  garcons: 4,
  garconetes: 2,
  copeiros: 1,
  chefes: 1,
  ilhas: 2,
  selectedDishIds: ["dish-1"],
  rechauds: 0,
  fritadeiras: 0,
};

test("material: convidados × 0,1 arredonda para cima", () => {
  const bases = basesMap({ bases: DEFAULT_BASES } as CadastrosData);
  const qty = materialQuantity(
    material({
      id: "m1",
      name: "Prato raso",
      factors: [{ baseId: "base-convidados", mult: 0.1 }],
    }),
    bases,
    ctx,
    1,
  );
  assert.equal(qty, 10);
});

test("material: 1 a cada 100 convidados", () => {
  const bases = basesMap({ bases: DEFAULT_BASES } as CadastrosData);
  const qty = materialQuantity(
    material({
      id: "m2",
      name: "Forno",
      factors: [{ baseId: "base-fornos", mult: 1 }],
    }),
    bases,
    ctx,
    1,
  );
  assert.equal(qty, 1);
});

test("separação lista o material do prato selecionado", () => {
  const data = cadastros([
    material({
      id: "m1",
      name: "Concha",
      factors: [{ baseId: "base-fixo", mult: 3 }],
    }),
  ]);
  const items = computeSeparationItems(data, ctx);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.computedQty, 3);
  assert.deepEqual(items[0]?.dishNames, ["Arroz"]);
});

test("kit: quantidade sugerida e total do item", () => {
  const kit: MaterialKit = {
    id: "kit-1",
    name: "Kit ilha",
    scaleBaseId: "base-ilhas",
    items: [{ materialId: "m1", qtyPerKit: 4 }],
    createdAt: stamp,
    updatedAt: stamp,
  };
  const event = createBlankEvent({ islands: 2 });
  const data = cadastros([], [kit]);
  assert.equal(suggestedKitQuantity(kit, event, data), 2);
  assert.equal(kitItemComputedTotal(4, 2), 8);
  assert.equal(kitItemTotal(kit, "m1", 4, 2, { quantity: 2, itemTotals: { m1: 10 } }), 10);
});

test("alocação: janela entrega → recolhimento e pico do dia", () => {
  const event = createBlankEvent({
    id: "ev-1",
    title: "Casamento",
    date: "2026-06-10",
    materialDeliveryDate: "2026-06-09",
    materialPickupDate: "2026-06-11",
    selectedDishIds: ["dish-1"],
    guests: { adults: 80, children: 0, professionals: 0 },
    status: "confirmado",
  });
  const window = allocationWindow(event);
  assert.ok(window);
  assert.equal(window.start, "2026-06-09");
  assert.equal(window.end, "2026-06-11");
  assert.equal(window.assumedDelivery, false);
  assert.ok(windowOverlaps(window.start, window.end, "2026-06-08", "2026-06-14"));

  const data = cadastros([
    material({
      id: "m1",
      name: "Cadeira",
      factors: [{ baseId: "base-fixo", mult: 40 }],
    }),
  ]);
  const week = buildAllocationWeek([event], data, new Map([["m1", 30]]), [
    "2026-06-08",
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
  ]);
  assert.equal(week.events.length, 1);
  assert.equal(week.ruptures.length, 1);
  assert.equal(week.ruptures[0]?.peak, 40);
  assert.equal(week.ruptures[0]?.shortage, 10);
  assert.equal(week.ruptures[0]?.days[0]?.demand, 0);
  assert.equal(week.ruptures[0]?.days[1]?.demand, 40);
});

test("controle: perda = saiu − voltou; descartável não volta", () => {
  assert.equal(controlLossQty({ sent: 10, returned: 7 }), 3);
  assert.equal(controlLossQty({ sent: 4, returned: 9 }), 0);
  assert.equal(defaultReturned("descartavel", 12), 0);
  assert.equal(defaultReturned("permanente", 12), 12);

  const control: EventMaterialControl = {
    id: "ctrl-1",
    eventId: "ev-1",
    eventTitle: "Festa",
    eventCode: "CB-1",
    eventDate: "2026-06-10",
    status: "conferido",
    items: [{ materialId: "m1", planned: 10, sent: 10, returned: 8, reason: "quebra", note: "" }],
    note: "",
    updatedAt: stamp,
  };
  const movements = stockMovementsFromControl(control);
  assert.equal(movements.length, 2);
  assert.equal(movements[0]?.quantity, -10);
  assert.equal(movements[1]?.quantity, 8);
});

test("insumos: saldo, consumo médio e estoque mínimo", () => {
  const movements: InsumoMovement[] = [
    { id: "1", insumoId: "i1", type: "entrada", quantity: 30, date: "2026-06-01" },
    { id: "2", insumoId: "i1", type: "saida", quantity: -15, date: "2026-06-10" },
    { id: "3", insumoId: "i1", type: "perda", quantity: -3, date: "2026-06-12" },
  ];
  const balances = computeInsumoBalances(movements);
  assert.equal(balances.get("i1"), 12);

  const daily = averageDailyConsumption(movements, "i1", "2026-06-30");
  assert.equal(daily, 18 / 30);
  assert.equal(suggestedMinimum(2, 5), 10);

  const meta: InsumoMeta = { insumoId: "i1", min: 99, leadDays: 5, minSource: "calculo", perishable: true };
  assert.equal(effectiveMinimum(meta, 2), 10);
  assert.equal(effectiveMinimum({ ...meta, minSource: "manual" }, 2), 99);
});

test("contas a receber: saldo e status", () => {
  const item: ReceivableRecord = {
    id: "r1",
    clientId: "c1",
    clientName: "Cliente",
    eventId: "e1",
    eventCode: "CB-1",
    eventTitle: "Festa",
    description: "",
    amount: 1000,
    competence: "2026-06",
    canceled: false,
    notes: "",
    charges: [
      { id: "ch1", kind: "evento", date: "2026-06-01", description: "Contrato", amount: 8000, createdAt: stamp },
      { id: "ch2", kind: "extra", date: "2026-06-02", description: "Hora extra", amount: 500, createdAt: stamp },
    ],
    receipts: [{ id: "rc1", date: "2026-06-05", amount: 3000, method: "pix", note: "", attachmentName: "", attachmentDataUrl: "", createdAt: stamp }],
    changeLog: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
  assert.equal(contractedAmount(item), 8500);
  assert.equal(receivedTotal(item), 3000);
  assert.equal(remainingAmount(item), 5500);
  assert.equal(receivableStatus(item), "parcial");
  assert.equal(receivableStatus({ ...item, receipts: [...item.receipts, { ...item.receipts[0], id: "rc2", amount: 5500 }] }), "pago");
  assert.equal(receivableStatus({ ...item, canceled: true }), "cancelado");
});
