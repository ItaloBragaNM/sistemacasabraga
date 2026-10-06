import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBlankEvent } from "@/lib/event-factory";
import { remoteEventSyncAction, snapshotForDirty } from "@/lib/eventos/remote-sync";

describe("eco remoto da ficha do evento", () => {
  it("ignora o salvamento da criação quando só o horário mudou", () => {
    const created = createBlankEvent({ title: "Casamento Ana" });
    const draft = { ...created, title: "Casamento Ana e Pedro" };
    const incoming = { ...created, updatedAt: "2026-10-06T18:00:00.000Z" };
    assert.equal(
      remoteEventSyncAction(incoming, draft, snapshotForDirty(created), true),
      "ignore",
    );
  });

  it("ignora o eco do próprio autosave enquanto a pessoa continua digitando", () => {
    const created = createBlankEvent({ title: "Festa" });
    const saved = { ...created, title: "Festa Junina" };
    const draft = { ...saved, title: "Festa Junina da firma" };
    assert.equal(
      remoteEventSyncAction(
        { ...saved, updatedAt: "2026-10-06T18:01:00.000Z" },
        draft,
        snapshotForDirty(created),
        true,
        [snapshotForDirty(saved)],
      ),
      "ignore",
    );
  });

  it("une quando outro computador mudou um campo de verdade", () => {
    const created = createBlankEvent({ title: "Festa", dietaryNotes: "" });
    const draft = { ...created, title: "Festa da Ana" };
    const incoming = { ...created, dietaryNotes: "Sem glúten", updatedAt: "2026-10-06T18:02:00.000Z" };
    assert.equal(
      remoteEventSyncAction(incoming, draft, snapshotForDirty(created), true),
      "merge",
    );
  });

  it("adota a versão remota quando a ficha não tem edição local", () => {
    const created = createBlankEvent({ title: "Festa" });
    const incoming = { ...created, title: "Festa na praia", updatedAt: "2026-10-06T18:03:00.000Z" };
    assert.equal(
      remoteEventSyncAction(incoming, created, snapshotForDirty(created), false),
      "adopt",
    );
  });
});
