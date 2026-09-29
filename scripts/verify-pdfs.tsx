import { mkdir, writeFile } from "node:fs/promises";
import type { ReactElement } from "react";
import path from "node:path";
import { pdf } from "@react-pdf/renderer";
import { CatalogDocument } from "../src/components/cozinha/insumos-separacao-pdf";
import { InsumoCountDocument } from "../src/components/cozinha/insumos-inventario-pdf";
import { SheetDocument } from "../src/components/cozinha/ficha-tecnica-pdf";
import { LossFormDocument } from "../src/components/cozinha/perdas-pdf";
import { KitchenDocument } from "../src/components/events/kitchen-pdf";
import { RuptureDocument } from "../src/components/logistica/alocacao-pdf";
import { CountSheetDocument, InventorySessionDocument } from "../src/components/logistica/inventario-pdf";
import { SeparationDocument } from "../src/components/logistica/separacao-pdf";
import { VehicleLogDocument } from "../src/components/veiculos/registro-uso-pdf";
import { createBlankEvent } from "../src/lib/event-factory";

const outDir = path.join(process.cwd(), "scripts/out");

function longNames(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix} ${String(index + 1).padStart(3, "0")}`);
}

async function writePdf(name: string, document: ReactElement) {
  const buffer = await pdf(document).toBuffer();
  const file = path.join(outDir, `${name}.pdf`);
  await writeFile(file, buffer);
  console.log(`ok ${name}.pdf (${buffer.length} bytes)`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const event = createBlankEvent({
    id: "ev-pdf",
    code: "CB-100",
    title: "Casamento PDF",
    date: "2026-06-20",
    status: "confirmado",
    guests: { adults: 120, children: 8, professionals: 6 },
    staff: { garcons: 6, garconetes: 4, copeiros: 2, chefes: 2 },
    islands: 3,
  });

  await writePdf("ficha-cozinha", <KitchenDocument event={event} />);
  await writePdf(
    "separacao-materiais",
    <SeparationDocument
      event={event}
      rows={longNames("Material", 80).map((name, index) => ({
        name,
        category: index % 2 ? "Talheres" : "Pratos e Louças",
        unit: "un",
        quantity: index + 1,
        dishes: "Arroz, Risoto",
        edited: index === 3,
      }))}
    />,
  );
  await writePdf(
    "rupturas-semana",
    <RuptureDocument
      weekLabel="15–21 jun 2026"
      days={["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21"]}
      ruptures={[
        {
          materialId: "m1",
          name: "Cadeira Tiffany",
          category: "Mobiliário",
          unit: "un",
          stock: 20,
          peak: 40,
          shortage: 20,
          days: [
            { demand: 40, stock: 20, shortage: 20, events: [{ id: "ev-pdf", title: "Casamento PDF", code: "CB-100", qty: 40 }] },
          ],
        },
      ]}
      events={[
        {
          id: "ev-pdf",
          title: "Casamento PDF",
          code: "CB-100",
          status: "confirmado",
          date: "2026-06-20",
          start: "2026-06-19",
          end: "2026-06-21",
          assumedDelivery: false,
          assumedPickup: false,
          needs: [{ materialId: "m1", qty: 40 }],
        },
      ]}
    />,
  );
  await writePdf(
    "contagem-materiais",
    <CountSheetDocument
      date="2026-06-20"
      responsible="Ana"
      filters=""
      rows={longNames("Item", 70).map((name, index) => ({
        name,
        category: index % 2 ? "Talheres" : "Louças",
        location: "Depósito",
        unit: "un",
      }))}
    />,
  );
  await writePdf(
    "inventario-materiais",
    <InventorySessionDocument
      date="2026-06-20"
      responsible="Ana"
      participants={["Ana", "João"]}
      skipped={0}
      note="Contagem mensal"
      rows={longNames("Item", 70).map((name, index) => ({
        name,
        category: index % 2 ? "Talheres" : "Louças",
        previous: 10,
        counted: index % 5 === 0 ? 8 : 10,
      }))}
    />,
  );
  await writePdf(
    "ficha-tecnica",
    <SheetDocument
      sheet={{
        id: "ft-1",
        dishId: "dish-1",
        name: "Risoto de camarão",
        classification: "Prato quente",
        sector: "Cozinha quente",
        portionSize: "180 g",
        yieldWeight: 3600,
        yieldPortions: 20,
        yieldWeightUnit: "g",
        salePrice: 48,
        method: "Refogar, adicionar caldo e finalizar com manteiga.",
        ingredients: longNames("Ingrediente", 24).map((name, index) => ({
          id: `ing-${index}`,
          insumoId: `ins-${index}`,
          name,
          brand: "Casa",
          netQuantity: 100 + index,
          unit: "g",
          yieldPercent: 90,
          unitCost: 0.12,
        })),
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }}
    />,
  );
  await writePdf(
    "separacao-insumos",
    <CatalogDocument
      event={event}
      notes=""
      groups={longNames("Prato", 12).map((dishName, group) => ({
        dishId: `dish-${group}`,
        dishName,
        items: longNames("Insumo", 8).map((name, index) => ({
          insumoId: `${group}-${index}`,
          name,
          unit: "kg",
          dishes: [dishName],
        })),
      }))}
    />,
  );
  await writePdf(
    "contagem-insumos",
    <InsumoCountDocument
      title="Contagem de insumos"
      meta="20 de junho de 2026"
      blank
      rows={longNames("Insumo", 80).map((name, index) => ({
        name,
        category: index % 2 ? "Hortifruti" : "Mercearia",
        unit: "kg",
        system: 4,
      }))}
    />,
  );
  await writePdf(
    "inventario-insumos",
    <InsumoCountDocument
      title="Inventário de insumos"
      meta="20 de junho de 2026 · Ana"
      blank={false}
      rows={longNames("Insumo", 80).map((name, index) => ({
        name,
        category: index % 2 ? "Hortifruti" : "Mercearia",
        unit: "kg",
        system: 4,
        counted: index % 7 === 0 ? 3 : 4,
      }))}
    />,
  );
  await writePdf("desperdicios", <LossFormDocument dateLabel="20/06/2026" />);
  await writePdf(
    "registro-uso",
    <VehicleLogDocument
      startLabel="15/06/2026"
      endLabel="21/06/2026"
      sheets={[
        {
          vehicle: {
            id: "v1",
            name: "Van 01",
            plate: "ABC1D23",
            model: "Master",
            chassis: "",
            year: "2022",
            kind: "van",
            usageCategory: "misto",
            capacity: "16",
            notes: "",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          trips: [
            { date: "16/06", timeOut: "07:00", route: "Casa → evento", purpose: "Montagem", user: "João" },
          ],
        },
      ]}
    />,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
