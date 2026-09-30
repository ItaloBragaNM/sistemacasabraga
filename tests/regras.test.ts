import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultCadastros } from "@/lib/cadastros/defaults";
import type { CadastrosData } from "@/lib/cadastros/types";
import {
  averageDailyConsumption,
  effectiveMinimum,
  inventoryIsDue,
  movementsFromInsumoInventory,
  nextCountDate,
  stockSignal,
  suggestedMinimum,
} from "@/lib/cozinha/calc";
import type { InsumoMeta, InsumoMovement } from "@/lib/cozinha/types";
import { createBlankEvent, emptyUniforms } from "@/lib/event-factory";
import { contractedAmount, receivableStatus, receivableSummary, remainingAmount } from "@/lib/financeiro/calc";
import type { ReceivableRecord } from "@/lib/financeiro/types";
import { allocationWindow, buildAllocationWeek, clipBarToWeek } from "@/lib/logistica/alocacao";
import { controlLossQty, stockMovementsFromControl } from "@/lib/logistica/event-control";
import type { EventMaterialControl } from "@/lib/logistica/types";
import { applyLaborUniformDelta } from "@/lib/mao-de-obra/uniforms";
import type { ExternalWorker } from "@/lib/mao-de-obra/types";
import { drinkSeparationLines, laborUniformPieces, normalizeLaborAllocations } from "@/lib/types";

function cadastrosWithOneMaterial(): CadastrosData {
  const base = defaultCadastros();
  return {
    ...base,
    kits: [],
    materials: [
      {
        id: "prato-raso",
        name: "Prato raso",
        category: "Pratos e Louças",
        unit: "un",
        kind: "permanente",
        variants: [],
        factors: [{ baseId: "base-convidados", mult: 2 }],
        createdAt: "",
        updatedAt: "",
      },
    ],
    dishes: [
      {
        id: "risoto",
        name: "Risoto",
        category: base.dishCategories?.[0] ?? "Principal",
        materialIds: ["prato-raso"],
        insumoIds: [],
        createdAt: "",
        updatedAt: "",
      },
    ],
  } as CadastrosData;
}

function event(id: string, guests: number, delivery: string, pickup: string) {
  return createBlankEvent({
    id,
    code: id.toUpperCase(),
    title: `Evento ${id}`,
    status: "confirmado",
    date: delivery,
    materialDeliveryDate: delivery,
    materialPickupDate: pickup,
    guests: { adults: guests, children: 0, professionals: 0 },
    selectedDishIds: ["risoto"],
  });
}

describe("alocação e rupturas", () => {
  const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"];

  it("soma a demanda dos eventos simultâneos e calcula a falta pelo estoque", () => {
    const cadastros = cadastrosWithOneMaterial();
    const events = [event("a", 80, "2026-10-01", "2026-10-03"), event("b", 50, "2026-10-02", "2026-10-02")];
    const week = buildAllocationWeek(events, cadastros, new Map([["prato-raso", 200]]), days);
    const row = week.materials.find((item) => item.materialId === "prato-raso");
    assert.ok(row);
    assert.equal(row.days[0].demand, 160);
    assert.equal(row.days[1].demand, 260);
    assert.equal(row.days[1].shortage, 60);
    assert.equal(row.peak, 260);
    assert.equal(row.shortage, 60);
    assert.equal(week.ruptures.length, 1);
  });

  it("sem simultaneidade não há ruptura", () => {
    const cadastros = cadastrosWithOneMaterial();
    const events = [event("a", 80, "2026-10-01", "2026-10-01"), event("b", 50, "2026-10-03", "2026-10-03")];
    const week = buildAllocationWeek(events, cadastros, new Map([["prato-raso", 200]]), days);
    assert.equal(week.ruptures.length, 0);
  });

  it("evento cancelado não ocupa estoque", () => {
    const cancelled = { ...event("a", 80, "2026-10-01", "2026-10-03"), status: "cancelado" as const };
    assert.equal(allocationWindow(cancelled), null);
  });

  it("recolhimento antes da entrega vira janela de um dia", () => {
    const window = allocationWindow(event("a", 10, "2026-10-05", "2026-10-02"));
    assert.deepEqual(window && [window.start, window.end], ["2026-10-05", "2026-10-05"]);
  });

  it("recorta a barra do evento na semana", () => {
    assert.deepEqual(clipBarToWeek("2026-09-29", "2026-10-02", days), { col: 1, span: 2 });
    assert.equal(clipBarToWeek("2026-10-08", "2026-10-09", days), null);
  });
});

describe("controle de materiais em eventos", () => {
  it("perda é o que saiu menos o que voltou, nunca negativa", () => {
    assert.equal(controlLossQty({ sent: 10, returned: 7 }), 3);
    assert.equal(controlLossQty({ sent: 5, returned: 8 }), 0);
  });

  it("conferência baixa só a perda do estoque", () => {
    const control: EventMaterialControl = {
      id: "c1",
      eventId: "a",
      eventTitle: "Evento A",
      eventCode: "A",
      eventDate: "2026-10-01",
      status: "conferido",
      note: "",
      updatedAt: "2026-10-02T00:00:00.000Z",
      items: [{ materialId: "prato-raso", planned: 10, sent: 10, returned: 8, reason: "quebra", note: "" }],
    };
    const net = stockMovementsFromControl(control).reduce((sum, movement) => sum + movement.quantity, 0);
    assert.equal(net, -2);
    assert.equal(stockMovementsFromControl({ ...control, status: "rascunho" }).length, 0);
  });
});

describe("estoque mínimo e inventário de insumos", () => {
  const today = "2026-09-28";
  const movements: InsumoMovement[] = [
    { id: "1", insumoId: "arroz", type: "entrada", quantity: 100, date: "2026-09-01" },
    { id: "2", insumoId: "arroz", type: "saida", quantity: -45, date: "2026-09-10" },
    { id: "3", insumoId: "arroz", type: "perda", quantity: -15, date: "2026-09-20" },
    { id: "4", insumoId: "arroz", type: "saida", quantity: -30, date: "2026-07-01" },
  ];
  const meta: InsumoMeta = { insumoId: "arroz", min: 0, leadDays: 5, minSource: "calculo", perishable: false };

  it("consumo médio usa só saídas e perdas dos últimos 30 dias", () => {
    assert.equal(averageDailyConsumption(movements, "arroz", today), 2);
  });

  it("mínimo = consumo diário × dias de reposição", () => {
    assert.equal(suggestedMinimum(2, 5), 10);
    assert.equal(effectiveMinimum(meta, 2), 10);
    assert.equal(effectiveMinimum({ ...meta, minSource: "manual", min: 25 }, 2), 25);
  });

  it("alerta de compra no ponto de pedido e excesso acima de 3×", () => {
    assert.equal(stockSignal(10, meta, 2), "comprar");
    assert.equal(stockSignal(20, meta, 2), "ok");
    assert.equal(stockSignal(31, meta, 2), "excesso");
    assert.equal(stockSignal(50, { ...meta, leadDays: 0 }, 2), "sem-regra");
  });

  it("contagem semanal vence em 7 dias e mensal em 30", () => {
    assert.equal(nextCountDate("2026-09-21", "semanal"), "2026-09-28");
    assert.equal(inventoryIsDue("2026-09-21", "semanal", today), true);
    assert.equal(inventoryIsDue("2026-09-10", "mensal", today), false);
    assert.equal(inventoryIsDue(undefined, "mensal", today), true);
  });

  it("inventário ajusta o saldo pela diferença contada", () => {
    const adjust = movementsFromInsumoInventory({
      id: "inv",
      date: today,
      scope: "semanal",
      responsible: "",
      note: "",
      createdAt: "",
      items: [
        { insumoId: "arroz", previous: 10, counted: 8.5 },
        { insumoId: "feijao", previous: 4, counted: 4 },
      ],
    });
    assert.equal(adjust.length, 1);
    assert.equal(adjust[0].quantity, -1.5);
  });
});

describe("contas a receber", () => {
  const base = {
    id: "r1",
    clientName: "Cliente",
    eventTitle: "Evento",
    competence: "2026-09",
    notes: "",
    canceled: false,
    amount: 0,
    charges: [
      { id: "c1", kind: "evento", date: "2026-09-01", description: "Fechamento", amount: 10000 },
      { id: "c2", kind: "extra", date: "2026-09-05", description: "Hora extra", amount: 500 },
    ],
    receipts: [{ id: "p1", date: "2026-09-10", amount: 4000 }],
    changeLog: [],
  } as unknown as ReceivableRecord;

  it("valor contratado soma evento e extras; em aberto desconta pagamentos", () => {
    assert.equal(contractedAmount(base), 10500);
    assert.equal(remainingAmount(base), 6500);
    assert.equal(receivableStatus(base), "parcial");
  });

  it("status pago quando quitado e cancelado fora do resumo", () => {
    const paid = { ...base, receipts: [{ id: "p", date: "2026-09-10", amount: 10500 }] } as ReceivableRecord;
    assert.equal(receivableStatus(paid), "pago");
    const summary = receivableSummary([base, paid, { ...base, id: "x", canceled: true } as ReceivableRecord], "2026-09-28");
    assert.equal(summary.open, 6500);
    assert.equal(summary.eventTotal, 20000);
    assert.equal(summary.extraTotal, 1000);
    assert.equal(summary.receivedMonth, 14500);
  });
});

describe("bebidas da separação", () => {
  it("segue as premissas: refrigerante, suco e água", () => {
    const lines = drinkSeparationLines(147, {
      aguaGuestsPerCarboy: 50,
      aguaCarboyLiters: 20,
      refrigeranteMlPerPerson: 450,
      refrigeranteBottleMl: 2000,
      sucoMlPerPerson: 200,
    });
    assert.deepEqual(
      lines.map((line) => line.qty),
      ["34", "30", "3"],
    );
  });
});

describe("fardamento da equipe na ficha", () => {
  it("migra uma peça antiga e aceita várias no mesmo prestador", () => {
    const legacy = normalizeLaborAllocations([
      { workerId: "w1", functionKey: "garcom", uniformPiece: "dolma" },
    ]);
    assert.deepEqual(laborUniformPieces(legacy[0]), ["dolma"]);

    const multi = normalizeLaborAllocations([
      { workerId: "w1", functionKey: "garcom", uniformPieces: ["dolma", "bata"] },
    ]);
    assert.deepEqual(laborUniformPieces(multi[0]), ["dolma", "bata"]);
  });

  it("soma o tamanho de cada peça selecionada", () => {
    const worker = {
      id: "w1",
      uniformSizes: { dolma: "m", bata: "p", avental: "" },
    } as ExternalWorker;
    const next = applyLaborUniformDelta(
      emptyUniforms(),
      [],
      [
        {
          id: "w1",
          workerId: "w1",
          functionKey: "garcom",
          overtime: false,
          overtimeHours: 0,
          applyAllowance: true,
          uniformPieces: ["dolma", "bata"],
        },
      ],
      [worker],
    );
    assert.equal(next.dolma.m, 1);
    assert.equal(next.bata.p, 1);
    assert.equal(next.avental.p, 0);
  });
});
