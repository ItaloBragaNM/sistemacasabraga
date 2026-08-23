export const EVENT_STATUSES = [
  "rascunho",
  "confirmado",
  "em_preparacao",
  "realizado",
  "cancelado",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_TYPES = [
  "casamento",
  "aniversario",
  "corporativo",
  "coffee",
  "brunch",
  "formatura",
  "quinze_anos",
  "cha",
  "coquetel",
  "tematico",
  "outro",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type VenueKind = "casa_braga" | "externo";
export type YesNo = "sim" | "nao" | "";

export interface Venue {
  kind: VenueKind;
  name: string;
  address: string;
}

export interface Guests {
  adults: number;
  children: number;
  professionals: number;
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

export const STAFF_ROLES = [
  { key: "garcons", label: "Garçons" },
  { key: "garconetes", label: "Garçonetes" },
  { key: "copeiros", label: "Copeiros(as)" },
  { key: "chefes", label: "Chefes/Staff" },
  { key: "segurancas", label: "Seguranças" },
  { key: "portaria", label: "Portaria" },
  { key: "monitor", label: "Monitor" },
  { key: "gerente", label: "Gerente" },
  { key: "apoioSalao", label: "Apoio Salão" },
  { key: "outros", label: "Outros" },
] as const;

export type StaffRoleKey = (typeof STAFF_ROLES)[number]["key"];
export type StaffCounts = Record<StaffRoleKey, number>;

export const DRINK_ITEMS = [
  { key: "agua", label: "Água" },
  { key: "refrigerante", label: "Refrigerante" },
  { key: "suco", label: "Suco" },
  { key: "espumante", label: "Espumante" },
  { key: "vinho", label: "Vinho" },
  { key: "cerveja", label: "Cerveja" },
  { key: "whisky", label: "Whisky" },
  { key: "vodka", label: "Vodka" },
  { key: "cafe", label: "Café" },
  { key: "licor", label: "Licor" },
] as const;

export type DrinkKey = (typeof DRINK_ITEMS)[number]["key"];
export type DrinkQuantities = Record<DrinkKey, string>;

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

export interface EventRecord {
  id: string;
  code: string;
  title: string;
  type: EventType;
  status: EventStatus;
  date: string;
  materialDeliveryDate: string;
  foodDeliveryDate: string;
  perCapita: number;
  venue: Venue;
  guests: Guests;
  teamArrival: string;
  invitationTime: string;
  serviceTime: string;
  staff: StaffCounts;
  menu: Menu;
  drinks: DrinkQuantities;
  uniforms: Uniforms;
  logistics: Logistics;
  dietaryNotes: string;
  menuSetupNotes: string;
  createdAt: string;
  updatedAt: string;
}

export function guestTotal(guests: Guests) {
  return (guests.adults || 0) + (guests.children || 0) + (guests.professionals || 0);
}

export function servingTotal(guests: Guests) {
  return guestTotal(guests);
}

export function staffTotal(staff: StaffCounts) {
  return STAFF_ROLES.reduce((sum, role) => sum + (staff[role.key] || 0), 0);
}
