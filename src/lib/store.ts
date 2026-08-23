import { createBlankEvent, nextEventCode } from "./event-factory";
import { SEED_EVENTS } from "./seed";
import type { EventRecord } from "./types";

const STORAGE_KEY = "casa-braga.events.v1";
const EVENT_NAME = "casa-braga-events";

let snapshot: EventRecord[] = structuredClone(SEED_EVENTS);

function readStorage(): EventRecord[] {
  if (typeof window === "undefined") return structuredClone(SEED_EVENTS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EVENTS));
      return structuredClone(SEED_EVENTS);
    }
    const parsed = JSON.parse(raw) as EventRecord[];
    if (!Array.isArray(parsed)) throw new Error("invalid store");
    return parsed;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EVENTS));
    return structuredClone(SEED_EVENTS);
  }
}

export function loadEvents(): EventRecord[] {
  snapshot = readStorage();
  return snapshot;
}

export function getEventsSnapshot() {
  return snapshot;
}

export function getServerEventsSnapshot() {
  return SEED_EVENTS;
}

export function subscribeEvents(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  snapshot = readStorage();
  const onChange = () => {
    snapshot = readStorage();
    callback();
  };
  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function persistEvents(events: EventRecord[]) {
  snapshot = events;
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function saveEvent(events: EventRecord[], next: EventRecord) {
  const index = events.findIndex((item) => item.id === next.id);
  const updated = [...events];
  const stamped = { ...next, updatedAt: new Date().toISOString() };
  if (index >= 0) updated[index] = stamped;
  else updated.unshift(stamped);
  persistEvents(updated);
  return updated;
}

export function deleteEvent(events: EventRecord[], id: string) {
  const updated = events.filter((item) => item.id !== id);
  persistEvents(updated);
  return updated;
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
