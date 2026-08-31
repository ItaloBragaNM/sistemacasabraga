import { readState, writeState } from "@/lib/store/kv.server";
import { normalizeEventRecord, type EventRecord } from "@/lib/types";

const KEY = "eventos";
const FILE = "eventos.json";

function normalize(input: unknown): EventRecord[] {
  const list = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as { events?: unknown }).events)
      ? (input as { events: unknown[] }).events
      : [];
  return list
    .map((item) => {
      try {
        const event = normalizeEventRecord(item as EventRecord);
        return event.id ? event : null;
      } catch {
        return null;
      }
    })
    .filter((event): event is EventRecord => Boolean(event));
}

export async function readEventos(): Promise<EventRecord[]> {
  return normalize(await readState<unknown>(KEY, FILE));
}

export async function writeEventos(events: EventRecord[]): Promise<EventRecord[]> {
  const normalized = normalize(events);
  await writeState(KEY, FILE, normalized);
  return normalized;
}
