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

export const SERVICE_STYLES = [
  "buffet",
  "empratado",
  "estacoes",
  "cocktail",
  "coffee",
  "brunch",
] as const;

export type ServiceStyle = (typeof SERVICE_STYLES)[number];

export type VenueKind = "casa_braga" | "externo";
export type StaffKind = "interna" | "externa";
export type MaterialSource = "estoque" | "aluguel" | "compra";

export interface Client {
  name: string;
  company: string;
  phone: string;
  email: string;
  dayContactName: string;
  dayContactPhone: string;
}

export interface Venue {
  kind: VenueKind;
  name: string;
  address: string;
  notes: string;
}

export interface Guests {
  adults: number;
  children: number;
}

export interface TimelineItem {
  id: string;
  time: string;
  activity: string;
  owner: string;
}

export interface MenuItem {
  id: string;
  name: string;
  quantity: string;
  notes: string;
}

export interface Menu {
  reception: MenuItem[];
  starters: MenuItem[];
  mains: MenuItem[];
  sides: MenuItem[];
  desserts: MenuItem[];
  kids: MenuItem[];
  drinks: MenuItem[];
  dietaryNotes: string;
  kitchenNotes: string;
}

export const MENU_SECTIONS = [
  { key: "reception", label: "Recepção e canapés" },
  { key: "starters", label: "Entradas e saladas" },
  { key: "mains", label: "Pratos quentes" },
  { key: "sides", label: "Guarnições" },
  { key: "desserts", label: "Sobremesas" },
  { key: "kids", label: "Menu infantil" },
  { key: "drinks", label: "Bebidas" },
] as const;

export type MenuSectionKey = (typeof MENU_SECTIONS)[number]["key"];

export interface StaffMember {
  id: string;
  role: string;
  name: string;
  quantity: number;
  kind: StaffKind;
  shift: string;
  dailyRate: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  source: MaterialSource;
  notes: string;
}

export interface VehicleAssignment {
  id: string;
  vehicle: string;
  driver: string;
  departure: string;
  returnTime: string;
  purpose: string;
}

export interface FinanceSummary {
  contractValue: number;
  paid: number;
  paymentNotes: string;
}

export interface EventRecord {
  id: string;
  code: string;
  title: string;
  type: EventType;
  status: EventStatus;
  date: string;
  startTime: string;
  endTime: string;
  assemblyTime: string;
  teardownTime: string;
  client: Client;
  venue: Venue;
  guests: Guests;
  serviceStyle: ServiceStyle;
  uniform: string;
  serviceNotes: string;
  commercialOwner: string;
  operationalOwner: string;
  timeline: TimelineItem[];
  menu: Menu;
  staff: StaffMember[];
  materials: MaterialItem[];
  vehicles: VehicleAssignment[];
  finance: FinanceSummary;
  briefing: string;
  attentionPoints: string;
  createdAt: string;
  updatedAt: string;
}

export function guestTotal(guests: Guests) {
  return (guests.adults || 0) + (guests.children || 0);
}
