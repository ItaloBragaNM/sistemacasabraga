import type {
  Client,
  EventRecord,
  EventStatus,
  EventType,
  FinanceSummary,
  Guests,
  Menu,
  MenuItem,
  ServiceStyle,
  Venue,
} from "./types";

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function menuItem(
  name: string,
  quantity = "",
  notes = "",
): MenuItem {
  return { id: uid(), name, quantity, notes };
}

export function emptyMenu(): Menu {
  return {
    reception: [],
    starters: [],
    mains: [],
    sides: [],
    desserts: [],
    kids: [],
    drinks: [],
    dietaryNotes: "",
    kitchenNotes: "",
  };
}

export function emptyClient(): Client {
  return {
    name: "",
    company: "",
    phone: "",
    email: "",
    dayContactName: "",
    dayContactPhone: "",
  };
}

export function casaBragaVenue(): Venue {
  return {
    kind: "casa_braga",
    name: "Casa Braga",
    address: "Fortaleza, CE",
    notes: "",
  };
}

export function emptyGuests(): Guests {
  return { adults: 0, children: 0 };
}

export function emptyFinance(): FinanceSummary {
  return { contractValue: 0, paid: 0, paymentNotes: "" };
}

export function createBlankEvent(partial?: Partial<EventRecord>): EventRecord {
  const now = new Date().toISOString();
  return {
    id: uid(),
    code: "",
    title: "",
    type: "outro",
    status: "rascunho",
    date: now.slice(0, 10),
    startTime: "19:00",
    endTime: "23:00",
    assemblyTime: "14:00",
    teardownTime: "00:30",
    client: emptyClient(),
    venue: casaBragaVenue(),
    guests: emptyGuests(),
    serviceStyle: "buffet",
    uniform: "Social Casa Braga",
    serviceNotes: "",
    commercialOwner: "",
    operationalOwner: "",
    timeline: [],
    menu: emptyMenu(),
    staff: [],
    materials: [],
    vehicles: [],
    finance: emptyFinance(),
    briefing: "",
    attentionPoints: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function nextEventCode(existing: EventRecord[], date = new Date()) {
  const year = date.getFullYear();
  const prefix = `CB-${year}-`;
  const numbers = existing
    .map((event) => event.code)
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number(code.replace(prefix, "")))
    .filter((value) => Number.isFinite(value));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function eventDefaults(input: {
  title: string;
  date: string;
  type: EventType;
  status?: EventStatus;
  serviceStyle?: ServiceStyle;
}): Pick<EventRecord, "title" | "date" | "type" | "status" | "serviceStyle"> {
  return {
    title: input.title,
    date: input.date,
    type: input.type,
    status: input.status ?? "rascunho",
    serviceStyle: input.serviceStyle ?? "buffet",
  };
}
