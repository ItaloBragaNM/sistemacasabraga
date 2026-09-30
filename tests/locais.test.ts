import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyLocalLogistics, normalizeLocal, venueFromLocal } from "@/lib/cadastros/locais";
import { emptyLogistics } from "@/lib/types";

describe("cadastro de locais", () => {
  it("normaliza o local e monta o venue da ficha", () => {
    const local = normalizeLocal({
      id: "salão",
      name: "  Salão Aurora  ",
      kind: "externo",
      address: "Av. Beira Mar, 100",
      outOfTown: true,
      logistics: { hasKitchen: "sim", hasFridge: "nao" },
    });
    assert.ok(local);
    assert.equal(local.name, "Salão Aurora");
    assert.equal(local.outOfTown, true);
    assert.equal(local.logistics.hasKitchen, "sim");
    assert.equal(local.logistics.hasFridge, "nao");
    assert.deepEqual(venueFromLocal(local), {
      kind: "externo",
      name: "Salão Aurora",
      address: "Av. Beira Mar, 100",
    });
  });

  it("copia a logística do espaço sem apagar o restante da ficha", () => {
    const current = { ...emptyLogistics(), alcoholServed: "sim" as const, alcohol: "vinho" };
    const next = applyLocalLogistics(current, {
      logistics: {
        hasKitchen: "sim",
        hasSink: "sim",
        hasFridge: "",
        hasStove: "",
        hasFreezer: "",
        hasOven: "",
        hasMicrowave: "",
        trestleTable: "nao",
        materialPreviousDay: "sim",
        mustCollectMaterial: "",
      },
    });
    assert.equal(next.alcoholServed, "sim");
    assert.equal(next.alcohol, "vinho");
    assert.equal(next.hasKitchen, "sim");
    assert.equal(next.materialPreviousDay, "sim");
    assert.equal(next.trestleTable, "nao");
  });
});
