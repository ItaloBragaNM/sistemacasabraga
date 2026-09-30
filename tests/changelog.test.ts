import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBlankEvent } from "@/lib/event-factory";
import { withChangeLog } from "@/lib/eventos/changelog";

const actor = { id: "u1", name: "Ana", username: "ana" };

describe("histórico do relatório", () => {
  it("grava follow-up só com o motivo, sem exigir outro campo alterado", () => {
    const event = createBlankEvent({ title: "Casamento", serviceTime: "19:00" });
    const created = withChangeLog(null, event, actor);
    const next = withChangeLog(created, created, actor, { reason: "Cliente confirmou horário" });
    const last = next.changeLog.at(-1);
    assert.ok(last);
    assert.equal(last.reason, "Cliente confirmou horário");
    assert.equal(last.changes[0]?.label, "Follow-up");
  });

  it("registra mudança de campo sem motivo no salvamento automático", () => {
    const previous = withChangeLog(null, createBlankEvent({ title: "Antes" }), actor);
    const next = withChangeLog(previous, { ...previous, title: "Depois" }, actor);
    const last = next.changeLog.at(-1);
    assert.ok(last);
    assert.equal(last.reason, undefined);
    assert.equal(last.changes.some((change) => change.label === "Nome"), true);
  });
});
