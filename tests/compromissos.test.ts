import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checklistForKind,
  checklistProgress,
  emptyMeeting,
  markChecklist,
  normalizeMeeting,
} from "@/lib/compromissos/types";

describe("compromissos", () => {
  it("monta o checklist da reunião interna com salão, café e petit fours", () => {
    const items = checklistForKind("interna");
    assert.deepEqual(
      items.map((item) => item.key),
      ["salao", "preparar_salao", "cafe", "petit_fours", "agua", "material"],
    );
    assert.ok(items.every((item) => !item.done));
  });

  it("monta o checklist da reunião externa com veículo e motorista", () => {
    const items = checklistForKind("externa");
    assert.ok(items.some((item) => item.key === "veiculo"));
    assert.ok(items.some((item) => item.key === "motorista"));
  });

  it("ao trocar o tipo, mantém o que já estava feito e os itens extras", () => {
    const previous = [
      ...checklistForKind("interna").map((item) =>
        item.key === "cafe" ? { ...item, done: true } : item,
      ),
      { key: "extra-1", label: "Levar contrato", done: true, custom: true },
    ];
    const next = checklistForKind("externa", previous);
    assert.ok(next.some((item) => item.key === "veiculo"));
    assert.ok(!next.some((item) => item.key === "cafe"));
    const extra = next.find((item) => item.key === "extra-1");
    assert.ok(extra);
    assert.equal(extra.done, true);
  });

  it("marca um item e calcula o progresso", () => {
    const marked = markChecklist(checklistForKind("externa"), "veiculo", true);
    const progress = checklistProgress(marked);
    assert.equal(progress.done, 1);
    assert.equal(progress.total, 5);
  });

  it("normaliza reunião antiga sem checklist", () => {
    const meeting = normalizeMeeting({ id: "r1", title: "Alinhamento", kind: "interna" });
    assert.ok(meeting);
    assert.equal(meeting.title, "Alinhamento");
    assert.ok(meeting.checklist.length > 0);
    assert.equal(emptyMeeting({ kind: "externa" }).kind, "externa");
  });
});
