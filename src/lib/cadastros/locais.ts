import {
  yesNoValue,
  type Logistics,
  type Venue,
  type VenueKind,
} from "@/lib/types";
import {
  CASA_BRAGA_LOCAL_ID,
  emptyLocalLogistics,
  LOCAL_SPACE_FLAGS,
  type LocalRecord,
  type LocalSpaceLogistics,
} from "./types";

export function emptyLocal(partial: Partial<LocalRecord> = {}): LocalRecord {
  const stamp = new Date().toISOString();
  return {
    id: partial.id ?? "",
    name: partial.name ?? "",
    kind: partial.kind === "casa_braga" ? "casa_braga" : "externo",
    address: partial.address ?? "",
    contactName: partial.contactName ?? "",
    phone: partial.phone ?? "",
    email: partial.email ?? "",
    outOfTown: Boolean(partial.outOfTown),
    parkingNotes: partial.parkingNotes ?? "",
    accessNotes: partial.accessNotes ?? "",
    loadingNotes: partial.loadingNotes ?? "",
    logistics: { ...emptyLocalLogistics(), ...partial.logistics },
    notes: partial.notes ?? "",
    createdAt: partial.createdAt ?? stamp,
    updatedAt: partial.updatedAt ?? stamp,
  };
}

export function defaultCasaBragaLocal(): LocalRecord {
  return emptyLocal({
    id: CASA_BRAGA_LOCAL_ID,
    name: "Casa Braga",
    kind: "casa_braga",
    address: "Fortaleza, CE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
}

export function normalizeLocalLogistics(input: unknown): LocalSpaceLogistics {
  const next = emptyLocalLogistics();
  if (!input || typeof input !== "object") return next;
  const record = input as Partial<LocalSpaceLogistics>;
  for (const flag of LOCAL_SPACE_FLAGS) {
    next[flag.key] = yesNoValue(record[flag.key]);
  }
  return next;
}

export function normalizeLocal(
  input: (Partial<Omit<LocalRecord, "logistics">> & { logistics?: Partial<LocalSpaceLogistics> }) | null | undefined,
): LocalRecord | null {
  if (!input?.id) return null;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return null;
  const kind: VenueKind = input.kind === "casa_braga" ? "casa_braga" : "externo";
  return {
    id: input.id,
    name,
    kind,
    address: typeof input.address === "string" ? input.address : "",
    contactName: typeof input.contactName === "string" ? input.contactName : "",
    phone: typeof input.phone === "string" ? input.phone : "",
    email: typeof input.email === "string" ? input.email : "",
    outOfTown: Boolean(input.outOfTown),
    parkingNotes: typeof input.parkingNotes === "string" ? input.parkingNotes : "",
    accessNotes: typeof input.accessNotes === "string" ? input.accessNotes : "",
    loadingNotes: typeof input.loadingNotes === "string" ? input.loadingNotes : "",
    logistics: normalizeLocalLogistics(input.logistics),
    notes: typeof input.notes === "string" ? input.notes : "",
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

export function venueFromLocal(local: Pick<LocalRecord, "kind" | "name" | "address">): Venue {
  return {
    kind: local.kind,
    name: local.name,
    address: local.address,
  };
}

export function applyLocalLogistics(current: Logistics, local: Pick<LocalRecord, "logistics">): Logistics {
  return { ...current, ...local.logistics };
}

export function mergeDefaultLocais(stored: LocalRecord[]): LocalRecord[] {
  if (stored.some((item) => item.id === CASA_BRAGA_LOCAL_ID)) return stored;
  return [defaultCasaBragaLocal(), ...stored];
}
