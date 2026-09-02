import type {
  EventRecord,
  EventType,
  Guests,
  Logistics,
  Menu,
  MenuItem,
  MenuSectionKey,
  Uniforms,
  Venue,
} from "./types";
import {
  compactMenu,
  guestTotal,
  MENU_SECTIONS,
  normalizeDrinks,
  normalizeEventType,
  normalizeStaff,
  suggestedDrinkQuantities,
} from "./types";

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
  return compactMenu(filled);
}

export function menuSectionForCategory(category: string): MenuSectionKey {
  const lower = category.trim().toLowerCase();
  return MENU_SECTIONS.find((section) => section.label.toLowerCase() === lower)?.key ?? "menu";
}

export function insertDishesIntoMenu(
  menu: Menu,
  dishes: { name: string; category: string }[],
): Menu {
  const next = compactMenu();
  const claimed = new Set<string>();
  for (const dish of dishes) {
    const name = dish.name.trim();
    if (!name) continue;
    const key = menuSectionForCategory(dish.category);
    const existing = (menu[key] ?? []).find(
      (item) =>
        item.name.trim().toLowerCase() === name.toLowerCase() && !claimed.has(item.id),
    );
    if (existing) {
      claimed.add(existing.id);
      next[key] = [...next[key], existing];
    } else {
      next[key] = [...next[key], menuItem(name)];
    }
  }
  return next;
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
  const guests = { ...emptyGuests(), ...partial.guests };
  const drinks = normalizeDrinks(partial.drinks);
  const drinksAuto = partial.drinksAuto !== false;
  return {
    id: uid(),
    code: "",
    title: "",
    status: "rascunho",
    date: now.slice(0, 10),
    materialDeliveryDate: "",
    materialPickupDate: "",
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
    changeLog: [],
    ...partial,
    type: normalizeEventType(partial.type ?? "social"),
    clientId: partial.clientId ?? "",
    venue: { ...casaBragaVenue(), ...partial.venue },
    guests,
    staff: normalizeStaff(partial.staff),
    menu: emptyMenu(partial.menu),
    drinksAuto,
    drinks: drinksAuto ? suggestedDrinkQuantities(guestTotal(guests)) : drinks,
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
