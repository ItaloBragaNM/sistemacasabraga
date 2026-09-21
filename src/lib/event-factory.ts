import type {
  EventMenuSection,
  EventRecord,
  EventType,
  Logistics,
  Menu,
  MenuItem,
  MenuSectionKey,
  Uniforms,
  Venue,
} from "./types";
import {
  compactMenu,
  emptyGuests,
  emptyLogistics,
  guestTotal,
  MENU_SECTIONS,
  normalizeAttachments,
  normalizeDrinks,
  normalizeEventType,
  extrasFromLegacyStaff,
  normalizeExtraStaff,
  normalizeGuests,
  normalizeLogistics,
  normalizeMenuPlan,
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

export function menuFromPlan(plan: EventMenuSection[]): Menu {
  const next = emptyMenu();
  for (const section of plan) {
    const key = menuSectionForCategory(section.title);
    next[key] = [...next[key], ...section.items.filter((item) => item.name.trim())];
  }
  return compactMenu(next);
}

export function upsertMenuPlanFromDishes(
  previous: EventMenuSection[],
  dishes: { name: string; category: string }[],
): EventMenuSection[] {
  const prevItems = new Map<string, MenuItem>();
  for (const section of previous) {
    for (const item of section.items) {
      const key = item.name.trim().toLocaleLowerCase("pt-BR");
      if (key && !prevItems.has(key)) prevItems.set(key, item);
    }
  }
  const selected = dishes
    .map((dish) => ({ name: dish.name.trim(), category: dish.category.trim() || "Menu" }))
    .filter((dish) => dish.name);
  const selectedKeys = new Set(selected.map((dish) => dish.name.toLocaleLowerCase("pt-BR")));

  const plan = previous
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => selectedKeys.has(item.name.trim().toLocaleLowerCase("pt-BR"))),
    }))
    .filter((section) => section.items.length > 0);

  const present = new Set(
    plan.flatMap((section) => section.items.map((item) => item.name.trim().toLocaleLowerCase("pt-BR"))),
  );

  for (const dish of selected) {
    const key = dish.name.toLocaleLowerCase("pt-BR");
    if (present.has(key)) continue;
    let section = plan.find(
      (item) => item.title.trim().toLocaleLowerCase("pt-BR") === dish.category.toLocaleLowerCase("pt-BR"),
    );
    if (!section) {
      section = { id: uid(), title: dish.category, time: "", items: [] };
      plan.push(section);
    }
    const existing = prevItems.get(key);
    section.items.push(existing ? { ...existing, name: dish.name } : menuItem(dish.name));
    present.add(key);
  }
  return plan;
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

export { emptyGuests };

export function casaBragaVenue(): Venue {
  return {
    kind: "casa_braga",
    name: "Casa Braga",
    address: "Fortaleza, CE",
  };
}

export function createBlankEvent(
  partial: Partial<Omit<EventRecord, "logistics">> & { logistics?: Partial<Logistics> } = {},
): EventRecord {
  const now = new Date().toISOString();
  const uniforms = emptyUniforms();
  const guests = normalizeGuests({ ...emptyGuests(), ...partial.guests });
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
    extraStaff: extrasFromLegacyStaff(partial.staff, normalizeExtraStaff(partial.extraStaff)),
    outOfTown: Boolean(partial.outOfTown),
    vehicleIds: Array.isArray(partial.vehicleIds) ? partial.vehicleIds.filter((id): id is string => typeof id === "string") : [],
    laborAllocations: Array.isArray(partial.laborAllocations) ? partial.laborAllocations : [],
    ceremonyTime: typeof partial.ceremonyTime === "string" ? partial.ceremonyTime : "",
    serviceDuration: typeof partial.serviceDuration === "string" ? partial.serviceDuration : "",
    drinksNotes: typeof partial.drinksNotes === "string" ? partial.drinksNotes : "",
    logisticsNotes: typeof partial.logisticsNotes === "string" ? partial.logisticsNotes : "",
    managementNotes: typeof partial.managementNotes === "string" ? partial.managementNotes : "",
    attachments: normalizeAttachments(partial.attachments),
    menu: emptyMenu(partial.menu),
    menuPlan: normalizeMenuPlan(partial.menuPlan),
    drinksAuto,
    drinks: drinksAuto && !partial.drinks
      ? suggestedDrinkQuantities(guestTotal(guests))
      : drinksAuto
        ? normalizeDrinks(partial.drinks)
        : drinks,
    uniforms: {
      dolma: { ...uniforms.dolma, ...partial.uniforms?.dolma },
      bata: { ...uniforms.bata, ...partial.uniforms?.bata },
      avental: { ...uniforms.avental, ...partial.uniforms?.avental },
    },
    logistics: normalizeLogistics({ ...emptyLogistics(), ...partial.logistics }),
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
