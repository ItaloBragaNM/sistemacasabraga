import { uid } from "@/lib/event-factory";

export const MEETING_KINDS = ["interna", "externa"] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];

export const MEETING_KIND_LABELS: Record<MeetingKind, string> = {
  interna: "Reunião interna",
  externa: "Reunião externa",
};

export const MEETING_STATUSES = ["agendada", "confirmada", "realizada", "cancelada"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export interface MeetingChecklistItem {
  key: string;
  label: string;
  done: boolean;
  custom?: boolean;
}

export const DEFAULT_CHECKLIST: Record<MeetingKind, { key: string; label: string }[]> = {
  interna: [
    { key: "salao", label: "Definir o salão" },
    { key: "preparar_salao", label: "Preparar o salão" },
    { key: "cafe", label: "Preparar café" },
    { key: "petit_fours", label: "Preparar petit fours" },
    { key: "agua", label: "Água na mesa" },
    { key: "material", label: "Material de apoio (bloco, caneta, projetor)" },
  ],
  externa: [
    { key: "veiculo", label: "Veículo" },
    { key: "motorista", label: "Motorista" },
    { key: "endereco", label: "Confirmar endereço" },
    { key: "horario", label: "Confirmar horário" },
    { key: "pasta", label: "Pasta / material da reunião" },
  ],
};

export interface MeetingRecord {
  id: string;
  title: string;
  kind: MeetingKind;
  status: MeetingStatus;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  salon: string;
  address: string;
  clientId: string;
  attendees: string;
  vehicleId: string;
  driverName: string;
  notes: string;
  checklist: MeetingChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export function checklistForKind(
  kind: MeetingKind,
  previous: MeetingChecklistItem[] = [],
): MeetingChecklistItem[] {
  const template = DEFAULT_CHECKLIST[kind];
  const prev = new Map(previous.map((item) => [item.key, item]));
  const next = template.map((item) => ({
    key: item.key,
    label: item.label,
    done: prev.get(item.key)?.done ?? false,
  }));
  const extras = previous.filter(
    (item) => item.custom && !template.some((row) => row.key === item.key),
  );
  return [...next, ...extras];
}

export function markChecklist(
  items: MeetingChecklistItem[],
  key: string,
  done: boolean,
): MeetingChecklistItem[] {
  return items.map((item) => (item.key === key ? { ...item, done } : item));
}

export function checklistProgress(items: MeetingChecklistItem[]) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { done, total };
}

export function emptyMeeting(partial: Partial<MeetingRecord> = {}): MeetingRecord {
  const stamp = new Date().toISOString();
  const kind = partial.kind === "externa" ? "externa" : "interna";
  return {
    id: partial.id ?? uid(),
    title: partial.title ?? "",
    kind,
    status: MEETING_STATUSES.includes(partial.status as MeetingStatus) ? (partial.status as MeetingStatus) : "agendada",
    date: partial.date ?? stamp.slice(0, 10),
    startTime: partial.startTime ?? "",
    endTime: partial.endTime ?? "",
    locationId: partial.locationId ?? "",
    salon: partial.salon ?? "",
    address: partial.address ?? "",
    clientId: partial.clientId ?? "",
    attendees: partial.attendees ?? "",
    vehicleId: partial.vehicleId ?? "",
    driverName: partial.driverName ?? "",
    notes: partial.notes ?? "",
    checklist: Array.isArray(partial.checklist) && partial.checklist.length
      ? partial.checklist
      : checklistForKind(kind),
    createdAt: partial.createdAt ?? stamp,
    updatedAt: partial.updatedAt ?? stamp,
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeMeeting(input: Partial<MeetingRecord> | null | undefined): MeetingRecord | null {
  if (!input?.id) return null;
  const kind = input.kind === "externa" ? "externa" : "interna";
  const status = MEETING_STATUSES.includes(input.status as MeetingStatus)
    ? (input.status as MeetingStatus)
    : "agendada";
  const checklist = Array.isArray(input.checklist)
    ? input.checklist
        .filter((item) => item && typeof item.label === "string" && item.label.trim())
        .map((item) => ({
          key: typeof item.key === "string" && item.key ? item.key : uid(),
          label: item.label.trim(),
          done: Boolean(item.done),
          custom: Boolean(item.custom),
        }))
    : [];
  return {
    id: input.id,
    title: asString(input.title).trim(),
    kind,
    status,
    date: asString(input.date).slice(0, 10),
    startTime: asString(input.startTime).slice(0, 5),
    endTime: asString(input.endTime).slice(0, 5),
    locationId: asString(input.locationId),
    salon: asString(input.salon),
    address: asString(input.address),
    clientId: asString(input.clientId),
    attendees: asString(input.attendees),
    vehicleId: asString(input.vehicleId),
    driverName: asString(input.driverName),
    notes: asString(input.notes),
    checklist: checklist.length ? checklist : checklistForKind(kind),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
  };
}

export interface CompromissosData {
  meetings: MeetingRecord[];
}

export function emptyCompromissos(): CompromissosData {
  return { meetings: [] };
}
