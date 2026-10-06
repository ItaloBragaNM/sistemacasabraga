import { normalizeEventRecord, type EventRecord } from "@/lib/types";

export function snapshotForDirty(event: EventRecord) {
  const normalized = normalizeEventRecord(event);
  return JSON.stringify({ ...normalized, changeLog: undefined, updatedAt: undefined });
}

export type RemoteEventSyncAction = "ignore" | "adopt" | "merge";

/**
 * Distingue o eco do próprio salvamento (criar evento, autosave) de uma
 * edição de verdade feita em outro computador.
 */
export function remoteEventSyncAction(
  incoming: EventRecord,
  draft: EventRecord,
  baselineSnap: string,
  dirty: boolean,
  ownSnaps: Iterable<string> = [],
): RemoteEventSyncAction {
  const incomingSnap = snapshotForDirty(incoming);
  const draftSnap = snapshotForDirty(draft);
  if (incomingSnap === draftSnap) return dirty ? "ignore" : "adopt";
  if (!dirty) return "adopt";
  if (incomingSnap === baselineSnap) return "ignore";
  for (const snap of ownSnaps) {
    if (incomingSnap === snap) return "ignore";
  }
  return "merge";
}
