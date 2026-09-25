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
  /** Prato do catálogo; cópias no cardápio compartilham o mesmo id na logística. */
  sourceDishId?: string;
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

export interface EventMenuSection {
  id: string;
  title: string;
  time: string;
  items: MenuItem[];
}

export function emptyMenuItemList(): MenuItem[] {
  return [];
}

export function normalizeMenuItem(input: unknown): MenuItem | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Partial<MenuItem>;
  const name = typeof row.name === "string" ? row.name : "";
  if (!name.trim() && !row.id) return null;
  return {
    id: typeof row.id === "string" && row.id ? row.id : `item-${Math.random().toString(36).slice(2, 10)}`,
    name,
    quantity: typeof row.quantity === "string" ? row.quantity : "",
    notes: typeof row.notes === "string" ? row.notes : "",
    sourceDishId:
      typeof row.sourceDishId === "string" && row.sourceDishId.trim()
        ? row.sourceDishId.trim()
        : undefined,
  };
}

export function normalizeMenuPlan(input: unknown): EventMenuSection[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item): EventMenuSection | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<EventMenuSection>;
      const items = Array.isArray(row.items)
        ? row.items.map(normalizeMenuItem).filter((rowItem): rowItem is MenuItem => Boolean(rowItem))
        : [];
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title && items.length === 0) return null;
      return {
        id: typeof row.id === "string" && row.id ? row.id : `sec-${Math.random().toString(36).slice(2, 10)}`,
        title: title || "Seção",
        time: typeof row.time === "string" ? row.time : "",
        items,
      };
    })
    .filter((section): section is EventMenuSection => Boolean(section));
}

/** Layout editável do cardápio; se vazio, deriva das categorias fixas. */
export function eventMenuSections(event: Pick<EventRecord, "menu" | "menuPlan">): EventMenuSection[] {
  const planned = normalizeMenuPlan(event.menuPlan);
  if (planned.length > 0) return planned;
  return MENU_SECTIONS.map((section) => ({
    id: section.key,
    title: section.label,
    time: "",
    items: (event.menu?.[section.key] ?? []).filter((item) => item.name.trim()),
  })).filter((section) => section.items.length > 0);
}

export interface EventAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
}

export const EVENT_ATTACHMENT_MAX_FILES = 4;
export const EVENT_ATTACHMENT_MAX_BYTES = 500 * 1024;

export function normalizeAttachments(input: unknown): EventAttachment[] {
  if (!Array.isArray(input)) return [];
  const next: EventAttachment[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<EventAttachment>;
    const dataUrl = typeof row.dataUrl === "string" ? row.dataUrl : "";
    const mime = typeof row.mime === "string" ? row.mime : "";
    if (!dataUrl.startsWith("data:") || (!mime.startsWith("image/") && !mime.startsWith("video/"))) continue;
    next.push({
      id: typeof row.id === "string" && row.id ? row.id : `att-${next.length + 1}`,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : "arquivo",
      mime,
      size: Number(row.size) || 0,
      dataUrl,
    });
    if (next.length >= EVENT_ATTACHMENT_MAX_FILES) break;
  }
  return next;
}

export const STAFF_ROLES = [
  { key: "garcons", label: "Garçons" },
  { key: "garconetes", label: "Garçonetes" },
  { key: "copeiros", label: "Copeiros(as)" },
  { key: "chefes", label: "Chefes" },
] as const;

export type StaffRoleKey = (typeof STAFF_ROLES)[number]["key"];
export type StaffCounts = Record<StaffRoleKey, number>;

export function emptyStaff(): StaffCounts {
  return Object.fromEntries(STAFF_ROLES.map((role) => [role.key, 0])) as StaffCounts;
}

/** Funções opcionais acrescentadas na ficha com “+”. */
export const EXTRA_STAFF_ROLES = [
  { key: "staff_producao", label: "Staff de produção" },
  { key: "staff_montagem", label: "Staff de montagem" },
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

const FIXED_STAFF_KEYS = new Set<string>(STAFF_ROLES.map((role) => role.key));

/** Funções que ainda podem ser acrescentadas com “+”. Não inclui as já fixas na equipe. */
export const PICKABLE_EXTRA_STAFF_ROLES = EXTRA_STAFF_ROLES.filter(
  (role) => role.key !== "staff" && !FIXED_STAFF_KEYS.has(role.key),
);

export function extraStaffLabel(key: string) {
  return (
    EXTRA_STAFF_ROLES.find((role) => role.key === key)?.label ??
    STAFF_ROLES.find((role) => role.key === key)?.label ??
    key
  );
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

export function extrasFromLegacyStaff(staffInput: unknown, extras: ExtraStaffLine[]): ExtraStaffLine[] {
  const next = [...extras];
  const seen = new Set(next.map((line) => line.key));
  if (!staffInput || typeof staffInput !== "object") return next;
  const record = staffInput as Record<string, unknown>;
  const map: Record<string, ExtraStaffRoleKey> = {
    staff_producao: "staff_producao",
    staff_montagem: "staff_montagem",
    staff: "staff_producao",
  };
  for (const [from, to] of Object.entries(map)) {
    const amount = Number(record[from]) || 0;
    if (!amount || seen.has(to) || !EXTRA_STAFF_KEYS.has(to)) continue;
    next.push({ key: to, quantity: amount });
    seen.add(to);
  }
  return next;
}

export function normalizeStaff(input: unknown): StaffCounts {
  const next = emptyStaff();
  if (!input || typeof input !== "object") return next;
  const record = input as Record<string, unknown>;
  for (const role of STAFF_ROLES) {
    const amount = Number(record[role.key]);
    next[role.key] = Number.isFinite(amount) ? amount : 0;
  }
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

/** Premissas do cálculo automático de bebidas (editáveis em Configurações). */
export interface DrinkPremises {
  aguaGuestsPerCarboy: number;
  aguaCarboyLiters: number;
  refrigeranteMlPerPerson: number;
  refrigeranteBottleMl: number;
  sucoMlPerPerson: number;
}

export const DEFAULT_DRINK_PREMISES: DrinkPremises = {
  aguaGuestsPerCarboy: 50,
  aguaCarboyLiters: 20,
  refrigeranteMlPerPerson: 400,
  refrigeranteBottleMl: 2000,
  sucoMlPerPerson: 200,
};

export function normalizeDrinkPremises(input: unknown): DrinkPremises {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const num = (key: keyof DrinkPremises, fallback: number) => {
    const parsed = Number(src[key]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    aguaGuestsPerCarboy: num("aguaGuestsPerCarboy", DEFAULT_DRINK_PREMISES.aguaGuestsPerCarboy),
    aguaCarboyLiters: num("aguaCarboyLiters", DEFAULT_DRINK_PREMISES.aguaCarboyLiters),
    refrigeranteMlPerPerson: num(
      "refrigeranteMlPerPerson",
      DEFAULT_DRINK_PREMISES.refrigeranteMlPerPerson,
    ),
    refrigeranteBottleMl: num("refrigeranteBottleMl", DEFAULT_DRINK_PREMISES.refrigeranteBottleMl),
    sucoMlPerPerson: num("sucoMlPerPerson", DEFAULT_DRINK_PREMISES.sucoMlPerPerson),
  };
}

export function drinkPremisesHint(premises: DrinkPremises = DEFAULT_DRINK_PREMISES): string {
  const bottleL = premises.refrigeranteBottleMl / 1000;
  const bottleLabel = Number.isInteger(bottleL) ? String(bottleL) : bottleL.toFixed(1).replace(".", ",");
  return `Água: 1 garrafão de ${premises.aguaCarboyLiters} L a cada ${premises.aguaGuestsPerCarboy} convidados · Refrigerante: ${premises.refrigeranteMlPerPerson} ml por pessoa, em garrafas de ${bottleLabel} L · Suco: ${premises.sucoMlPerPerson} ml por pessoa, em litros.`;
}

/** Bebidas da logística a partir do total de convidados (a servir). */
export function suggestedDrinkQuantities(
  guests: number,
  premises: DrinkPremises = DEFAULT_DRINK_PREMISES,
): DrinkQuantities {
  const n = Math.max(0, Math.floor(Number(guests)) || 0);
  if (n <= 0) return emptyDrinks();
  const rules = normalizeDrinkPremises(premises);
  const bottleMl = rules.refrigeranteBottleMl || 2000;
  return {
    agua: `${countLabel(Math.ceil(n / rules.aguaGuestsPerCarboy), "garrafão", "garrafões")} de ${rules.aguaCarboyLiters} L`,
    refrigerante: `${countLabel(Math.ceil((n * rules.refrigeranteMlPerPerson) / bottleMl), "garrafa", "garrafas")} de ${bottleMl / 1000} L`.replace(
      ".0 L",
      " L",
    ),
    suco: `${Math.ceil((n * rules.sucoMlPerPerson) / 1000)} L`,
  };
}

export function syncDrinksToGuests(
  drinks: DrinkQuantities,
  previousGuests: number,
  nextGuests: number,
  premises: DrinkPremises = DEFAULT_DRINK_PREMISES,
): DrinkQuantities {
  const previous = suggestedDrinkQuantities(previousGuests, premises);
  const next = suggestedDrinkQuantities(nextGuests, premises);
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

/** Peças com pelo menos um tamanho > 0, para relatórios de fardamento. */
export function uniformPiecesForReport(uniforms: Uniforms | undefined) {
  return UNIFORM_PIECES.map((piece) => {
    const sizes = UNIFORM_SIZES.filter((size) => (uniforms?.[piece.key]?.[size] || 0) > 0).map(
      (size) => ({ size, quantity: uniforms![piece.key][size] }),
    );
    return { key: piece.key, label: piece.label, sizes };
  }).filter((piece) => piece.sizes.length > 0);
}

export function formatUniformSizeLine(
  sizes: { size: UniformSize; quantity: number }[],
  labels: Record<UniformSize, string>,
  separator = " · ",
) {
  return sizes.map((item) => `${labels[item.size]} ${item.quantity}`).join(separator);
}

export function isUniformPieceKey(value: unknown): value is UniformPieceKey {
  return UNIFORM_PIECES.some((piece) => piece.key === value);
}

export function isUniformSize(value: unknown): value is UniformSize {
  return (UNIFORM_SIZES as readonly string[]).includes(String(value));
}

export const ALCOHOL_TYPES = [
  { key: "cerveja", label: "Cerveja" },
  { key: "vinho", label: "Vinho" },
  { key: "espumante", label: "Espumante" },
  { key: "whisky", label: "Whisky" },
  { key: "vodka", label: "Vodka" },
  { key: "gin", label: "Gin" },
  { key: "tequila", label: "Tequila" },
  { key: "drinks", label: "Drinks / coquetéis" },
  { key: "outros", label: "Outros" },
] as const;

export function yesNoValue(value: unknown): YesNo {
  return value === "sim" || value === "nao" ? value : "";
}

export interface Logistics {
  /** Texto legado; também serve de detalhe quando “outros”. */
  alcohol: string;
  alcoholServed: YesNo;
  alcoholTypes: string[];
  materialPreviousDay: YesNo;
  trestleTable: YesNo;
  hasKitchen: YesNo;
  hasFreezer: YesNo;
  hasOven: YesNo;
  hasMicrowave: YesNo;
  flyingMenu: YesNo;
  mustCollectMaterial: YesNo;
  extraConservation: YesNo;
  extraConservationQty: string;
  iceCubes: YesNo;
  iceCubesQty: string;
  hasSink: YesNo;
  hasFridge: YesNo;
  hasStove: YesNo;
}

export function emptyLogistics(): Logistics {
  return {
    alcohol: "",
    alcoholServed: "",
    alcoholTypes: [],
    materialPreviousDay: "",
    trestleTable: "",
    hasKitchen: "",
    hasFreezer: "",
    hasOven: "",
    hasMicrowave: "",
    flyingMenu: "",
    mustCollectMaterial: "",
    extraConservation: "",
    extraConservationQty: "",
    iceCubes: "",
    iceCubesQty: "",
    hasSink: "",
    hasFridge: "",
    hasStove: "",
  };
}

export function normalizeLogistics(input: unknown): Logistics {
  const next = emptyLogistics();
  if (!input || typeof input !== "object") return next;
  const src = input as Partial<Logistics> & Record<string, unknown>;
  const alcohol = typeof src.alcohol === "string" ? src.alcohol : "";
  let types = Array.isArray(src.alcoholTypes)
    ? src.alcoholTypes.filter((item): item is string => typeof item === "string" && Boolean(item))
    : [];
  let alcoholText = alcohol;
  if (types.includes("destilados")) {
    types = types.filter((item) => item !== "destilados");
    if (!types.includes("outros")) types.push("outros");
    if (!alcoholText.toLowerCase().includes("destil")) {
      alcoholText = alcoholText.trim() ? `Destilados. ${alcoholText}` : "Destilados";
    }
  }
  let alcoholServed = yesNoValue(src.alcoholServed);
  if (!alcoholServed && alcoholText.trim()) alcoholServed = "sim";
  return {
    ...next,
    alcohol: alcoholText,
    alcoholServed,
    alcoholTypes: types,
    materialPreviousDay: yesNoValue(src.materialPreviousDay),
    trestleTable: yesNoValue(src.trestleTable),
    hasKitchen: yesNoValue(src.hasKitchen),
    hasFreezer: yesNoValue(src.hasFreezer),
    hasOven: yesNoValue(src.hasOven),
    hasMicrowave: yesNoValue(src.hasMicrowave),
    flyingMenu: yesNoValue(src.flyingMenu),
    mustCollectMaterial: yesNoValue(src.mustCollectMaterial),
    extraConservation: yesNoValue(src.extraConservation),
    extraConservationQty: typeof src.extraConservationQty === "string" ? src.extraConservationQty : "",
    iceCubes: yesNoValue(src.iceCubes),
    iceCubesQty: typeof src.iceCubesQty === "string" ? src.iceCubesQty : "",
    hasSink: yesNoValue(src.hasSink),
    hasFridge: yesNoValue(src.hasFridge),
    hasStove: yesNoValue(src.hasStove),
  };
}

export function alcoholSummary(logistics: Logistics): string {
  if (logistics.alcoholServed === "nao") return "Não";
  const labels = ALCOHOL_TYPES.filter((item) => logistics.alcoholTypes.includes(item.key)).map(
    (item) => item.label,
  );
  const parts = [labels.join(", "), logistics.alcohol.trim()].filter(Boolean);
  if (logistics.alcoholServed === "sim") return parts.join(" · ") || "Sim";
  return parts.join(" · ");
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

export interface EventLaborAllocation {
  id: string;
  workerId: string;
  functionKey: string;
  overtime: boolean;
  overtimeHours: number;
  /** Quando false, não aplica ajuda de custo mesmo fora da cidade. */
  applyAllowance: boolean;
  /** Diária neste evento. Se omitida, usa a tabela de valores da função. */
  daily?: number;
  /** Peça de fardamento deste prestador neste evento. */
  uniformPiece?: UniformPieceKey | "";
}

export function emptyLaborAllocations(): EventLaborAllocation[] {
  return [];
}

export function normalizeLaborAllocations(input: unknown): EventLaborAllocation[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const next: EventLaborAllocation[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<EventLaborAllocation>;
    const workerId = typeof row.workerId === "string" ? row.workerId : "";
    if (!workerId || seen.has(workerId)) continue;
    seen.add(workerId);
    const dailyRaw = (row as { daily?: unknown }).daily;
    const dailyParsed = Number(dailyRaw);
    const uniformPiece = isUniformPieceKey(row.uniformPiece) ? row.uniformPiece : "";
    next.push({
      id: typeof row.id === "string" && row.id ? row.id : workerId,
      workerId,
      functionKey: typeof row.functionKey === "string" ? row.functionKey : "",
      overtime: Boolean(row.overtime),
      overtimeHours: Number(row.overtimeHours) || 0,
      applyAllowance: row.applyAllowance !== false,
      daily: Number.isFinite(dailyParsed) ? dailyParsed : undefined,
      uniformPiece,
    });
  }
  return next;
}

export function normalizeLaborExtras(event: {
  laborOvertime?: boolean;
  laborOvertimeHours?: number;
  laborApplyAllowance?: boolean;
  outOfTown?: boolean;
  laborAllocations?: EventLaborAllocation[];
}): { laborOvertime: boolean; laborOvertimeHours: number; laborApplyAllowance: boolean } {
  const allocations = event.laborAllocations ?? [];
  const laborOvertime =
    typeof event.laborOvertime === "boolean"
      ? event.laborOvertime
      : allocations.some((item) => item.overtime);
  const hoursRaw =
    typeof event.laborOvertimeHours === "number"
      ? event.laborOvertimeHours
      : allocations.reduce((max, item) => Math.max(max, Number(item.overtimeHours) || 0), 0);
  const laborOvertimeHours = Number.isFinite(Number(hoursRaw)) ? Math.max(0, Number(hoursRaw)) : 0;
  const laborApplyAllowance =
    typeof event.laborApplyAllowance === "boolean"
      ? event.laborApplyAllowance
      : Boolean(event.outOfTown) &&
        (allocations.length === 0 || allocations.some((item) => item.applyAllowance !== false));
  return {
    laborOvertime,
    laborOvertimeHours,
    laborApplyAllowance,
  };
}

export function normalizeVehicleIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((id): id is string => typeof id === "string" && Boolean(id)))];
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
  /** Horário da cerimônia — opcional. */
  ceremonyTime: string;
  serviceTime: string;
  /** Duração prevista do serviço (ex.: 6 horas). */
  serviceDuration: string;
  staff: StaffCounts;
  /** Funções extras acrescentadas com “+”. */
  extraStaff: ExtraStaffLine[];
  menu: Menu;
  /** Pratos do catálogo (cadastro de cardápio) escolhidos para o evento. */
  selectedDishIds?: string[];
  /** Seções do cardápio deste evento (título, horário e ordem dos pratos). */
  menuPlan?: EventMenuSection[];
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
  /** Evento fora da cidade — dispara ajuda de custo da equipe externa. */
  outOfTown: boolean;
  /** Hora extra da equipe externa — uma vez por evento, aplicada a todos os prestadores. */
  laborOvertime: boolean;
  laborOvertimeHours: number;
  /** Ajuda de custo da equipe externa — uma vez por evento. */
  laborApplyAllowance: boolean;
  /** Veículos da frota alocados neste evento. */
  vehicleIds: string[];
  /** Prestadores da base de mão de obra externa. */
  laborAllocations: EventLaborAllocation[];
  dietaryNotes: string;
  menuSetupNotes: string;
  logisticsNotes: string;
  managementNotes: string;
  attachments: EventAttachment[];
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
  reason?: string;
  clientLabel?: string;
}

export type EventSaveMeta = {
  reason?: string;
  clientLabel?: string;
};

export function guestTotal(guests: Guests) {
  const kids =
    (guests.children0to5 || 0) + (guests.children5to10 || 0) || guests.children || 0;
  return (guests.adults || 0) + kids + (guests.professionals || 0);
}

export function guestsSummary(guests: Guests) {
  const normalized = normalizeGuests(guests);
  return `${normalized.adults} adultos · ${normalized.children0to5} crianças 0 a 5 · ${normalized.children5to10} crianças 5 a 10 · ${normalized.professionals} profissionais`;
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
  const laborAllocations = normalizeLaborAllocations(event.laborAllocations);
  const laborExtras = normalizeLaborExtras({ ...event, laborAllocations });
  return {
    ...event,
    type: normalizeEventType(event.type),
    guests,
    staff: normalizeStaff(event.staff),
    extraStaff: extrasFromLegacyStaff(event.staff, normalizeExtraStaff(event.extraStaff)),
    clientId: event.clientId ?? "",
    outOfTown: Boolean(event.outOfTown),
    ...laborExtras,
    vehicleIds: normalizeVehicleIds(event.vehicleIds),
    laborAllocations,
    ceremonyTime: typeof event.ceremonyTime === "string" ? event.ceremonyTime : "",
    serviceDuration: typeof event.serviceDuration === "string" ? event.serviceDuration : "",
    drinksNotes: typeof event.drinksNotes === "string" ? event.drinksNotes : "",
    logisticsNotes: typeof event.logisticsNotes === "string" ? event.logisticsNotes : "",
    managementNotes: typeof event.managementNotes === "string" ? event.managementNotes : "",
    attachments: normalizeAttachments(event.attachments),
    menu: compactMenu(event.menu),
    menuPlan: normalizeMenuPlan(event.menuPlan),
    logistics: normalizeLogistics(event.logistics),
    materialDeliveryDate: normalizeIsoDate(event.materialDeliveryDate),
    materialPickupDate: normalizeIsoDate(event.materialPickupDate),
    foodDeliveryDate: normalizeIsoDate(event.foodDeliveryDate),
    drinksAuto,
    drinks: normalizeDrinks(event.drinks),
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
        reason: typeof row.reason === "string" && row.reason.trim() ? row.reason.trim() : undefined,
        clientLabel:
          typeof row.clientLabel === "string" && row.clientLabel.trim()
            ? row.clientLabel.trim()
            : undefined,
      };
    })
    .filter((item): item is EventChangeLogEntry => Boolean(item));
}
