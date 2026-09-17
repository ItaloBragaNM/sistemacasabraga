import type { EventRecord } from "@/lib/types";
import { syncPaymentsFromEvents } from "./calc";
import { readMaoDeObra, writeMaoDeObra } from "./store.server";

export async function syncLaborPaymentsFromEvents(events: EventRecord[]) {
  const current = await readMaoDeObra();
  return writeMaoDeObra(syncPaymentsFromEvents(current, events));
}
