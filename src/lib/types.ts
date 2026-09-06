export const EVENT_STATUSES = [
  "rascunho",
  "confirmado",
  "em_preparacao",
  "realizado",
  "cancelado",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = [
  "aniversario",
  "casamento",
  "corporativo",
  "social",
  "encomenda",
  "locacao_espaco",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const LEGACY_EVENT_TYPES: Record<string, EventType> = {
  aniversario: "aniversario",
  casamento: "casamento",
  corporativo: "corporativo",
  social: "social",
  encomenda: "encomenda",
  locacao_espaco: "locacao_espaco",
  locacao: "locacao_espaco",
  coffee: "corporativo",
  brunch: "social",
  formatura: "social",
  quinze_anos: "aniversario",
  cha: "social",
  coquetel: "social",
  tematico: "social",
  outro: "social",
};

export function normalizeEventType(value: unknown): EventType {
  if (typeof value !== "string" || !value.trim()) return "social";
  const key = value.trim();
  const mapped = LEGACY_EVENT_TYPES[key] ?? LEGACY_EVENT_TYPES[key.toLowerCase()];
  if (mapped) return mapped;
  const lower = key.toLowerCase();
  if (lower.startsWith("anivers")) return "aniversario";
  if (lower.startsWith("casamento")) return "casamento";
  if (lower.startsWith("corpor")) return "corporativo";
  if (lower.startsWith("encomend")) return "encomenda";
  if (lower.includes("locac")) return "locacao_espaco";
  if (lower.startsWith("social")) return "social";
  return "social";
}

export type VenueKind = "casa_braga" | "externo";
export type YesNo = "sim" | "nao" | "";

export interface Venue {
  kind: VenueKind;
  name: string;
  address: string;
}

export interface Guests {
  adults: number;
  /** Soma das faixas — mantido para compatibilidade com fichas antigas. */
  children: number;
  children0to5?: number;
  children5to10?: number;
  professionals: number;
}

export function emptyGuests(): Guests {
  return { adults: 0, children: 0, children0to5: 0, children5to10: 0, professionals: 0 };
}

export function normalizeGuests(input: unknown): Guests {
  const next = emptyGuests();
  if (!input || typeof input !== "object") return next;
  const record = input as Partial<Guests>;
  const adults = Number(record.adults) || 0;
  const professionals = Number(record.professionals) || 0;
  const children0to5 = Number(record.children0to5) || 0;
  const children5to10 = Number(record.children5to10) || 0;
  const legacy = Number(record.children) || 0;
  const splitMissing = !("children0to5" in record) && !("children5to10" in record);
  if (splitMissing && legacy > 0) {
    return {
      adults,
      children: legacy,
      children0to5: 0,
      children5to10: legacy,
      professionals,
    };
  }
  const kids = children0to5 + children5to10;
  return {
    adults,
    children: kids,
    children0to5,
    children5to10,
    professionals,
  };
}

export interface MenuItem {
  id: string;
  name: string;
  quantity: string;
  notes: string;
}

export const MENU_SECTIONS = [
  { key: "paraComecar", label: "Para Começar", rows: 4 },
  { key: "amuseBouche", label: "Amuse Bouche", rows: 4 },
  { key: "ramequim", label: "Ramequim", rows: 3 },
  { key: "menu", label: "Menu", rows: 4 },
  { key: "mesaBuffet", label: "Mesa e Buffet", rows: 3 },
  { key: "saladas", label: "Saladas", rows: 2 },
  { key: "altasHoras", label: "Altas Horas", rows: 2 },
  { key: "sobremesas", label: "Sobremesas", rows: 2 },
  { key: "menuKids", label: "Menu Kids", rows: 2 },
  { key: "acompanhamentos", label: "Acompanhamentos", rows: 2 },
] as const;

export type MenuSectionKey = (typeof MENU_SECTIONS)[number]["key"];

export type Menu = Record<MenuSectionKey, MenuItem[]>;

export function compactMenu(menu?: Partial<Menu> | null): Menu {
  const next = {} as Menu;
  for (const section of MENU_SECTIONS) {
    next[section.key] = (menu?.[section.key] ?? []).filter((item) => item.name.trim());
  }
  return next;
}

export const STAFF_ROLES = [
  { key: "garcons", label: "Garçons" },
  { key: "garconetes", label: "Garçonetes" },
  { key: "copeiros", label: "Copeiros(as)" },
  { key: "chefes", label: "Chefes / staff" },
  { key: "outros", label: "Outros" },
] as const;

export type StaffRoleKey = (typeof STAFF_ROLES)[number]["key"];
export type StaffCounts = Record<StaffRoleKey, number>;

export function emptyStaff(): StaffCounts {
  return Object.fromEntries(STAFF_ROLES.map((role) => [role.key, 0])) as StaffCounts;
}

/** Funções opcionais acrescentadas na ficha com “+”. */
export const EXTRA_STAFF_ROLES = [
  { key: "gerente_evento", label: "Gerente de evento" },
  { key: "gerente_casa", label: "Gerente da casa" },
  { key: "staff", label: "Staff" },
  { key: "garcom", label: "Garçom" },
  { key: "garcom_extra", label: "Garçom extra" },
  { key: "garcom_noivos", label: "Garçom dos noivos" },
  { key: "garcom_debutante", label: "Garçom da debutante" },
  { key: "garcom_contratante", label: "Garçom da contratante" },
  { key: "garcom_lider", label: "Garçom lider" },
  { key: "garconete", label: "Garçonete" },
  { key: "garconete_extra", label: "Garçonete extra" },
  { key: "garconete_lider", label: "Garçonete Lider" },
  { key: "copa", label: "Copa" },
  { key: "recepcao", label: "Recepção" },
  { key: "porteiro", label: "Porteiro" },
  { key: "seguranca", label: "Segurança" },
  { key: "zeladoria", label: "Zeladoria" },
  { key: "monitor_kids", label: "Monitor kids" },
  { key: "apoio_salao", label: "Apoio de salão" },
  { key: "apoio", label: "Apoio" },
  { key: "fritadeira", label: "Fritadeira" },
  { key: "churrasqueiro", label: "Churrasqueiro" },
  { key: "corre", label: "Corre" },
  { key: "diarista", label: "Diarista" },
] as const;

export type ExtraStaffRoleKey = (typeof EXTRA_STAFF_ROLES)[number]["key"];

export interface ExtraStaffLine {
  key: ExtraStaffRoleKey;
  quantity: number;
}

const EXTRA_STAFF_KEYS = new Set<string>(EXTRA_STAFF_ROLES.map((role) => role.key));

export function extraStaffLabel(key: string) {
  return EXTRA_STAFF_ROLES.find((role) => role.key === key)?.label ?? key;
}

export function normalizeExtraStaff(input: unknown): ExtraStaffLine[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const next: ExtraStaffLine[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const row = item as { key?: unknown; quantity?: unknown };
    const key = typeof row.key === "string" ? row.key : "";
    if (!EXTRA_STAFF_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    next.push({
      key: key as ExtraStaffRoleKey,
      quantity: Number(row.quantity) || 0,
    });
  }
  return next;
}

export function normalizeStaff(input: unknown): StaffCounts {
  const next = emptyStaff();
  if (!input || typeof input !== "object") return next;
  const known = new Set<string>(STAFF_ROLES.map((role) => role.key));
  let extra = 0;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const amount = typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
    if (known.has(key)) next[key as StaffRoleKey] = amount;
    else extra += amount;
  }
  if (extra) next.outros += extra;
  return next;
}

export const DRINK_ITEMS = [
  { key: "agua", label: "Água" },
  { key: "refrigerante", label: "Refrigerante" },
  { key: "suco", label: "Suco" },
] as const;

export type DrinkKey = (typeof DRINK_ITEMS)[number]["key"];
export type DrinkQuantities = Record<DrinkKey, string>;

export function emptyDrinks(): DrinkQuantities {
  return { agua: "", refrigerante: "", suco: "" };
}

export function normalizeDrinks(input: unknown): DrinkQuantities {
  const next = emptyDrinks();
  if (!input || typeof input !== "object") return next;
  const record = input as Record<string, unknown>;
  for (const item of DRINK_ITEMS) {
    const value = record[item.key];
    next[item.key] = typeof value === "string" ? value : value == null ? "" : String(value);
  }
  return next;
}

function countLabel(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Bebidas da logística a partir do total de convidados (a servir). */
export function suggestedDrinkQuantities(guests: number): DrinkQuantities {
  const n = Math.max(0, Math.floor(Number(guests)) || 0);
  if (n <= 0) return emptyDrinks();
  return {
    agua: `${countLabel(Math.ceil(n / 50), "garrafão", "garrafões")} de 20 L`,
    refrigerante: `${countLabel(Math.ceil((n * 450) / 2000), "garrafa", "garrafas")} de 2 L`,
    suco: `${Math.ceil((n * 200) / 1000)} L`,
  };
}

export function syncDrinksToGuests(
  drinks: DrinkQuantities,
  previousGuests: number,
  nextGuests: number,
): DrinkQuantities {
  const previous = suggestedDrinkQuantities(previousGuests);
  const next = suggestedDrinkQuantities(nextGuests);
  const current = normalizeDrinks(drinks);
  const result = emptyDrinks();
  for (const item of DRINK_ITEMS) {
    const value = current[item.key] ?? "";
    result[item.key] = !value.trim() || value === previous[item.key] ? next[item.key] : value;
  }
  return result;
}

export const UNIFORM_PIECES = [
  { key: "dolma", label: "Dólmã" },
  { key: "bata", label: "Bata" },
  { key: "avental", label: "Avental" },
] as const;

export const UNIFORM_SIZES = ["p", "m", "g", "gg"] as const;

export type UniformPieceKey = (typeof UNIFORM_PIECES)[number]["key"];
export type UniformSize = (typeof UNIFORM_SIZES)[number];
export type UniformSizes = Record<UniformSize, number>;
export type Uniforms = Record<UniformPieceKey, UniformSizes>;

export interface Logistics {
  alcohol: string;
  materialPreviousDay: YesNo;
  trestleTable: YesNo;
  hasKitchen: YesNo;
  hasFreezer: YesNo;
  hasOven: YesNo;
  hasMicrowave: YesNo;
  flyingMenu: YesNo;
}

export interface MaterialSeparationOverride {
  quantity?: number;
  note?: string;
  removed?: boolean;
}

export interface MaterialSeparationExtra {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  note?: string;
}

export interface MaterialKitEventState {
  /** Number of kits sent to the event. Undefined = use the kit's suggested qty. */
  quantity?: number;
  /** Per-item total overrides (after qtyPerKit × kit qty). */
  itemTotals?: Record<string, number>;
}

export interface ExtraSelection {
  included: boolean;
  quantity: number;
}

export interface MaterialSeparationState {
  overrides: Record<string, MaterialSeparationOverride>;
  extras: MaterialSeparationExtra[];
  /** Catalog materials included without being linked to a dish. */
  addedMaterialIds?: string[];
  /** Per-kit quantity and proportion overrides for this event. */
  kits?: Record<string, MaterialKitEventState>;
  /** Checklist of catalog extras / equipment for this event. */
  extraSelections?: Record<string, ExtraSelection>;
  notes?: string;
  updatedAt?: string;
}

export function emptyMaterialSeparation(): MaterialSeparationState {
  return {
    overrides: {},
    extras: [],
    addedMaterialIds: [],
    kits: {},
    extraSelections: {},
    notes: "",
  };
}

export function normalizeMaterialSeparation(
  input?: MaterialSeparationState | null,
): MaterialSeparationState {
  const base = emptyMaterialSeparation();
  if (!input) return base;
  return {
    overrides: input.overrides ?? {},
    extras: Array.isArray(input.extras) ? input.extras : [],
    addedMaterialIds: Array.isArray(input.addedMaterialIds) ? input.addedMaterialIds : [],
    kits: input.kits && typeof input.kits === "object" ? input.kits : {},
    extraSelections:
      input.extraSelections && typeof input.extraSelections === "object"
        ? input.extraSelections
        : {},
    notes: typeof input.notes === "string" ? input.notes : "",
    updatedAt: input.updatedAt,
  };
}

export interface EventRecord {
  id: string;
  code: string;
  title: string;
  type: EventType;
  status: EventStatus;
  date: string;
  materialDeliveryDate: string;
  /** Último dia em que o material ainda está no evento (inclusive). */
  materialPickupDate: string;
  foodDeliveryDate: string;
  perCapita: number;
  venue: Venue;
  guests: Guests;
  /** Quantidade de ilhas (estações) — usada no cálculo de materiais. */
  islands?: number;
  /** Cliente da base de Cadastros → Clientes. */
  clientId?: string;
  teamArrival: string;
  invitationTime: string;
  /** Horário da cerimônia — obrigatório na ficha. */
  ceremonyTime: string;
  serviceTime: string;
  staff: StaffCounts;
  /** Funções extras acrescentadas com “+”. */
  extraStaff: ExtraStaffLine[];
  menu: Menu;
  /** Pratos do catálogo (cadastro de cardápio) escolhidos para o evento. */
  selectedDishIds?: string[];
  /** Ajustes manuais da separação de materiais deste evento. */
  materialSeparation?: MaterialSeparationState;
  drinks: DrinkQuantities;
  /**
   * Quando verdadeiro (padrão), água/refrigerante/suco acompanham o nº de convidados.
   * Passa a falso no primeiro ajuste manual dos campos.
   */
  drinksAuto?: boolean;
  drinksNotes: string;
  uniforms: Uniforms;
  logistics: Logistics;
  dietaryNotes: string;
  menuSetupNotes: string;
  logisticsNotes: string;
  createdAt: string;
  updatedAt: string;
  /** Quem alterou a ficha e o que mudou. */
  changeLog: EventChangeLogEntry[];
}

export interface EventFieldChange {
  label: string;
  from: string;
  to: string;
}

export interface EventChangeLogEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  changes: EventFieldChange[];
}

export function guestTotal(guests: Guests) {
  const kids =
    (guests.children0to5 || 0) + (guests.children5to10 || 0) || guests.children || 0;
  return (guests.adults || 0) + kids + (guests.professionals || 0);
}

export function guestsSummary(guests: Guests) {
  const normalized = normalizeGuests(guests);
  return `${normalized.adults} ad · ${normalized.children0to5} (0–5) · ${normalized.children5to10} (5–10) · ${normalized.professionals} prof`;
}

export function servingTotal(guests: Guests) {
  return guestTotal(guests);
}

export function staffTotal(staff: StaffCounts, extraStaff: ExtraStaffLine[] = []) {
  const base = STAFF_ROLES.reduce((sum, role) => sum + (staff[role.key] || 0), 0);
  const extra = extraStaff.reduce((sum, line) => sum + (line.quantity || 0), 0);
  return base + extra;
}

export function eventStaffLines(event: Pick<EventRecord, "staff" | "extraStaff">) {
  const extras = normalizeExtraStaff(event.extraStaff);
  return [
    ...STAFF_ROLES.filter((role) => (event.staff?.[role.key] || 0) > 0).map((role) => ({
      key: role.key,
      label: role.label,
      quantity: event.staff[role.key],
    })),
    ...extras
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        key: line.key,
        label: extraStaffLabel(line.key),
        quantity: line.quantity,
      })),
  ];
}

function normalizeIsoDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim().slice(0, 10);
}

export function normalizeEventRecord(event: EventRecord): EventRecord {
  const drinksAuto = event.drinksAuto !== false;
  const guests = normalizeGuests(event.guests);
  return {
    ...event,
    type: normalizeEventType(event.type),
    guests,
    staff: normalizeStaff(event.staff),
    extraStaff: normalizeExtraStaff(event.extraStaff),
    clientId: event.clientId ?? "",
    ceremonyTime: typeof event.ceremonyTime === "string" ? event.ceremonyTime : "",
    drinksNotes: typeof event.drinksNotes === "string" ? event.drinksNotes : "",
    logisticsNotes: typeof event.logisticsNotes === "string" ? event.logisticsNotes : "",
    menu: compactMenu(event.menu),
    materialDeliveryDate: normalizeIsoDate(event.materialDeliveryDate),
    materialPickupDate: normalizeIsoDate(event.materialPickupDate),
    foodDeliveryDate: normalizeIsoDate(event.foodDeliveryDate),
    drinksAuto,
    drinks: drinksAuto
      ? suggestedDrinkQuantities(guestTotal(guests))
      : normalizeDrinks(event.drinks),
    changeLog: normalizeChangeLog(event.changeLog),
  };
}

function normalizeChangeLog(input: unknown): EventChangeLogEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item): EventChangeLogEntry | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<EventChangeLogEntry>;
      if (!row.at) return null;
      const changes = Array.isArray(row.changes)
        ? row.changes
            .map((change) => {
              if (!change || typeof change !== "object") return null;
              const label = String(change.label ?? "").trim();
              if (!label) return null;
              return {
                label,
                from: String(change.from ?? ""),
                to: String(change.to ?? ""),
              };
            })
            .filter((change): change is EventFieldChange => Boolean(change))
        : [];
      if (changes.length === 0) return null;
      return {
        id: typeof row.id === "string" && row.id ? row.id : row.at,
        at: String(row.at),
        userId: typeof row.userId === "string" ? row.userId : "",
        userName: typeof row.userName === "string" && row.userName.trim() ? row.userName.trim() : "Alguém",
        changes,
      };
    })
    .filter((item): item is EventChangeLogEntry => Boolean(item));
}
