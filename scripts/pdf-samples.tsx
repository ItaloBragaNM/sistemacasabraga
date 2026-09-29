import type { ReactElement } from "react";
import { createBlankEvent } from "@/lib/event-factory";
import type { MaterialWeekRow, OccupyingEvent } from "@/lib/logistica/alocacao";

export type SampleDocs = Record<string, ReactElement>;

const CATEGORIES = ["Bandejas", "Café e Bebidas", "Consumíveis", "Copos e Taças", "Peças de Serviço", "Pratos e Louças", "Talheres", "Utensílios Cozinha"];

export const sampleEvent = createBlankEvent({
  code: "CB-2026-0015",
  title: "Maria & João",
  date: "2026-09-26",
  status: "confirmado",
  islands: 1,
  venue: { kind: "fora", name: "Vila Soares", address: "Vila Soares - Jacaúna, Aquiraz" },
  guests: { adults: 140, children: 7, professionals: 0 },
  staff: { garcons: 4, garconetes: 3, copeiros: 2, chefes: 2 },
} as never);

export const separationRows = Array.from({ length: 64 }, (_, i) => ({
  name: `Material de serviço ${i + 1}`,
  category: CATEGORIES[i % CATEGORIES.length],
  unit: i % 5 === 0 ? "cx" : "un",
  quantity: (i * 7) % 170,
  dishes: i % 9 === 0 ? "Mini Quiche (Para Começar), Cestinha, Folhado, Bombom de Queijo Coalho" : "",
  note: i % 11 === 0 ? "branco liso" : "",
  edited: i % 13 === 0,
})).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

export const separationExtra = {
  drinks: [
    { label: "Refrigerante", unit: "garrafas 2L", calc: "147 conv. × 450 ml = 66150 ml ÷ 2000 ml = 34 garrafa(s) 2L", qty: "34" },
    { label: "Suco", unit: "litros", calc: "147 conv. × 200 ml = 29400 ml ÷ 1000 = 30 litro(s)", qty: "30" },
    { label: "Água", unit: "galões 20L", calc: "147 conv. ÷ 50 = 3 galão(ões) 20L", qty: "3" },
  ],
  kits: ["Kit Cozinha", "Kit Rechaud", "Kit Higiene", "Kit Garçom", "Kit Fritadeira", "Kit Bebidas", "Kit Equipamentos"].map(
    (name, k) => ({
      name,
      kitQty: k + 1,
      scaleLabel: k % 2 ? `${k + 2} garç.` : undefined,
      items: Array.from({ length: 4 + (k % 4) }, (_, i) => ({ name: `Item ${i + 1} do ${name}`, perKit: i + 1, total: (i + 1) * (k + 1), edited: i === 1 && k === 2 })),
    }),
  ),
  extras: [{ name: "Tenda 3x3", quantity: 2 }],
  notes: "Entregar até 14h. Conferir taças antes de carregar.",
};

export const countRows = Array.from({ length: 130 }, (_, i) => ({
  name: `Material ${i + 1}`,
  category: CATEGORIES[i % CATEGORIES.length],
  location: i % 3 ? "Depósito A" : "Depósito B",
  unit: "un",
}));

export const inventoryRows = countRows.map((row, i) => ({
  name: row.name,
  category: row.category,
  previous: 20 + (i % 9),
  counted: 20 + (i % 9) - (i % 7 === 0 ? 2 : 0),
}));

export const insumoRows = Array.from({ length: 110 }, (_, i) => ({
  name: `Insumo ${i + 1}`,
  category: ["Laticínios", "Carnes", "Hortifruti", "Secos", "Bebidas"][i % 5],
  unit: i % 2 ? "kg" : "un",
  system: 10 + (i % 6),
  counted: 10 + (i % 6) - (i % 5 === 0 ? 1.5 : 0),
}));

const days = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
export const weekDays = days;

export const weekEvents: OccupyingEvent[] = Array.from({ length: 6 }, (_, i) => ({
  id: `e${i}`,
  title: `Evento ${i + 1}`,
  code: `CB-2026-00${20 + i}`,
  status: "confirmado",
  date: days[i],
  start: days[Math.max(0, i - 1)],
  end: days[Math.min(6, i + 1)],
  assumedDelivery: i === 2,
  assumedPickup: false,
  needs: [],
}));

export const weekRuptures: MaterialWeekRow[] = Array.from({ length: 30 }, (_, i) => ({
  materialId: `m${i}`,
  name: `Material crítico ${i + 1}`,
  category: CATEGORIES[i % CATEGORIES.length],
  unit: "un",
  stock: 40,
  peak: 52 + i,
  shortage: 12 + i,
  days: days.map((day, d) => ({
    demand: d % 2 ? 52 + i : 20,
    stock: 40,
    shortage: d % 2 ? 12 + i : 0,
    events: [],
  })),
}));
