import { readState, writeState } from "@/lib/store/kv.server";
import type { CrmSnapshot } from "./types";

const KEY = "comercial_dashboard";
const FILE = "comercial-crm.json";

export async function readSnapshot(): Promise<CrmSnapshot | null> {
  const snapshot = await readState<CrmSnapshot>(KEY, FILE);
  if (!snapshot || !Array.isArray(snapshot.leads)) return null;
  return snapshot;
}

export async function writeSnapshot(snapshot: CrmSnapshot): Promise<void> {
  await writeState(KEY, FILE, snapshot);
}
