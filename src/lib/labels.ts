import type {
  EventStatus,
  EventType,
  MaterialSource,
  ServiceStyle,
  StaffKind,
  VenueKind,
} from "./types";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  rascunho: "Rascunho",
  confirmado: "Confirmado",
  em_preparacao: "Em preparação",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  casamento: "Casamento",
  aniversario: "Aniversário",
  corporativo: "Corporativo",
  coffee: "Coffee break",
  brunch: "Brunch",
  formatura: "Formatura",
  quinze_anos: "15 anos",
  cha: "Chá",
  coquetel: "Coquetel",
  tematico: "Temático",
  outro: "Outro",
};

export const SERVICE_STYLE_LABELS: Record<ServiceStyle, string> = {
  buffet: "Buffet",
  empratado: "Empratado",
  estacoes: "Estações",
  cocktail: "Cocktail",
  coffee: "Coffee break",
  brunch: "Brunch",
};

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  casa_braga: "Casa Braga",
  externo: "Externo",
};

export const STAFF_KIND_LABELS: Record<StaffKind, string> = {
  interna: "Interna",
  externa: "Externa",
};

export const MATERIAL_SOURCE_LABELS: Record<MaterialSource, string> = {
  estoque: "Estoque",
  aluguel: "Aluguel",
  compra: "Compra",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
