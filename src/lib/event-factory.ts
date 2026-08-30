import type {
  DrinkQuantities,
  EventRecord,
  EventType,
  Guests,
  Logistics,
  Menu,
  MenuItem,
  Uniforms,
  Venue,
} from "./types";
import { MENU_SECTIONS, normalizeEventType, normalizeStaff } from "./types";

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function menuItem(name = "", quantity = "", notes = ""): MenuItem {
  return { id: uid(), name, quantity, notes };
}

export function emptyMenu(filled?: Partial<Record<keyof Menu, MenuItem[]>>): Menu {
  const menu = {} as Menu;
  for (const section of MENU_SECTIONS) {
    const existing = filled?.[section.key] ?? [];
    const rows = existing.length >= section.rows ? existing : [
      ...existing,
      ...Array.from({ length: section.rows - existing.length }, () => menuItem()),
    ];
    menu[section.key] = rows;
  }
  return menu;
}

export function emptyDrinks(): DrinkQuantities {
  return {
    agua: "",
    refrigerante: "",
    suco: "",
    espumante: "",
    vinho: "",
    cerveja: "",
    whisky: "",
    vodka: "",
    cafe: "",
    licor: "",
  };
}

export function emptyUniforms(): Uniforms {
  const sizes = { p: 0, m: 0, g: 0, gg: 0 };
  return {
    dolma: { ...sizes },
    bata: { ...sizes },
    avental: { ...sizes },
  };
}

export function emptyLogistics(): Logistics {
  return {
    alcohol: "",
    materialPreviousDay: "",
    trestleTable: "",
    hasKitchen: "",
    hasFreezer: "",
    hasOven: "",
    hasMicrowave: "",
    flyingMenu: "",
  };
}

export function casaBragaVenue(): Venue {
  return {
    kind: "casa_braga",
    name: "Casa Braga",
    address: "Fortaleza, CE",
  };
}

export function emptyGuests(): Guests {
  return { adults: 0, children: 0, professionals: 0 };
}

export function createBlankEvent(partial: Partial<EventRecord> = {}): EventRecord {
  const now = new Date().toISOString();
  const uniforms = emptyUniforms();
  return {
    id: uid(),
    code: "",
    title: "",
    status: "rascunho",
    date: now.slice(0, 10),
    materialDeliveryDate: "",
    foodDeliveryDate: "",
    perCapita: 0,
    islands: 0,
    selectedDishIds: [],
    teamArrival: "",
    invitationTime: "",
    serviceTime: "",
    dietaryNotes: "",
    menuSetupNotes: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
    type: normalizeEventType(partial.type ?? "social"),
    clientId: partial.clientId ?? "",
    venue: { ...casaBragaVenue(), ...partial.venue },
    guests: { ...emptyGuests(), ...partial.guests },
    staff: normalizeStaff(partial.staff),
    menu: emptyMenu(partial.menu),
    drinks: { ...emptyDrinks(), ...partial.drinks },
    uniforms: {
      dolma: { ...uniforms.dolma, ...partial.uniforms?.dolma },
      bata: { ...uniforms.bata, ...partial.uniforms?.bata },
      avental: { ...uniforms.avental, ...partial.uniforms?.avental },
    },
    logistics: { ...emptyLogistics(), ...partial.logistics },
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
}): Pick<EventRecord, "title" | "date" | "type"> {
  return {
    title: input.title,
    date: input.date,
    type: input.type,
  };
}
