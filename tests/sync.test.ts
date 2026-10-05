import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyJobs, stampsEqual, threeWayMerge, unwrapPutPayload } from "@/lib/store/sync";

describe("sincronização de estado", () => {
  it("reaplica a Mutation no snapshot do servidor e preserva o registro do outro usuário", () => {
    const server = [
      { id: "a", title: "Evento A" },
      { id: "b", title: "Alterado na outra máquina" },
    ];
    const jobs = [
      (list: typeof server) => list.map((item) => (item.id === "a" ? { ...item, title: "Evento A atualizado" } : item)),
    ];
    assert.deepEqual(applyJobs(server, jobs), [
      { id: "a", title: "Evento A atualizado" },
      { id: "b", title: "Alterado na outra máquina" },
    ]);
  });

  it("aceita envelope novo e payload antigo nas APIs", () => {
    assert.deepEqual(unwrapPutPayload({ data: [{ id: "1" }], updatedAt: "2026-10-01T12:00:00.000Z" }), {
      body: [{ id: "1" }],
      updatedAt: "2026-10-01T12:00:00.000Z",
    });
    assert.deepEqual(unwrapPutPayload({ meetings: [] }), { body: { meetings: [] }, updatedAt: null });
    assert.deepEqual(unwrapPutPayload([{ id: "1" }]), { body: [{ id: "1" }], updatedAt: null });
  });

  it("compara updated_at mesmo com fuso escrito de formas diferentes", () => {
    assert.equal(stampsEqual("2026-10-01T12:00:00.000Z", "2026-10-01T12:00:00+00:00"), true);
    assert.equal(stampsEqual("2026-10-01T12:00:00.000Z", "2026-10-01T12:00:01.000Z"), false);
    assert.equal(stampsEqual(null, "2026-10-01T12:00:00.000Z"), false);
  });

  it("une campos de dois usuários no mesmo registro em vez de apagar um deles", () => {
    const base = [{ id: "festa", guests: 80, menu: "Entrada" }];
    const server = [{ id: "festa", guests: 120, menu: "Entrada" }];
    const local = [{ id: "festa", guests: 80, menu: "Prato principal" }];
    assert.deepEqual(threeWayMerge(base, server, local), [
      { id: "festa", guests: 120, menu: "Prato principal" },
    ]);
  });

  it("mantém registros que só o outro usuário criou ou editou", () => {
    const base = [
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
    ];
    const server = [
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta na outra máquina" },
      { id: "c", title: "Novo deles" },
    ];
    const local = [
      { id: "a", title: "Alpha daqui" },
      { id: "b", title: "Beta" },
    ];
    assert.deepEqual(threeWayMerge(base, server, local), [
      { id: "a", title: "Alpha daqui" },
      { id: "b", title: "Beta na outra máquina" },
      { id: "c", title: "Novo deles" },
    ]);
  });
});
