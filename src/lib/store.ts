import { createBlankEvent, nextEventCode } from "./event-factory";
import { SEED_EVENTS } from "./seed";
import { normalizeEventRecord, type EventRecord } from "./types";

export const EVENTS_STORAGE_KEY = "casa-braga.events.v2";
const MIGRATED_KEY = "casa-braga.events.v2.migrated";

export function readLocalEvents(): EventRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map((item) => normalizeEventRecord(item as EventRecord))
      .filter((event) => Boolean(event.id));
  } catch {
    return null;
  }
}

export function localEventsWereMigrated(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MIGRATED_KEY) === "1";
}

export function markLocalEventsMigrated() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MIGRATED_KEY, "1");
}

/** Eventos deste aparelho que não são o catálogo de demonstração intacto. */
export function localEventsToMigrate(local: EventRecord[]): EventRecord[] {
  const seedById = new Map(SEED_EVENTS.map((event) => [event.id, event]));
  return local.filter((event) => {
    const seed = seedById.get(event.id);
    if (!seed) return true;
    return event.updatedAt !== seed.updatedAt || event.title !== seed.title;
  });
}

export function eventsDiffer(left: EventRecord[], right: EventRecord[]): boolean {
  if (left.length !== right.length) return true;
  const times = new Map(right.map((event) => [event.id, event.updatedAt]));
  return left.some((event) => times.get(event.id) !== event.updatedAt);
}

export function mergeEvents(server: EventRecord[], incoming: EventRecord[]): EventRecord[] {
  const byId = new Map(server.map((event) => [event.id, event]));
  for (const event of incoming) {
    const current = byId.get(event.id);
    if (!current || (event.updatedAt ?? "") >= (current.updatedAt ?? "")) {
      byId.set(event.id, event);
    }
  }
  return [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function saveEvent(events: EventRecord[], next: EventRecord) {
  const index = events.findIndex((item) => item.id === next.id);
  const updated = [...events];
  const stamped = normalizeEventRecord({ ...next, updatedAt: new Date().toISOString() });
  if (index >= 0) updated[index] = stamped;
  else updated.unshift(stamped);
  return updated;
}

export function deleteEvent(events: EventRecord[], id: string) {
  return events.filter((item) => item.id !== id);
}

export function createEvent(events: EventRecord[], draft?: Partial<EventRecord>) {
  const event = createBlankEvent({
    ...draft,
    code: draft?.code || nextEventCode(events),
  });
  return { event, events: saveEvent(events, event) };
}

export function findEvent(events: EventRecord[], id: string) {
  return events.find((item) => item.id === id) ?? null;
}
