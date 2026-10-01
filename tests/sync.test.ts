import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyJobs, stampsEqual, unwrapPutPayload } from "@/lib/store/sync";

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
});
