import type {
  EventStatus,
  EventType,
  UniformSize,
  VenueKind,
  YesNo,
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

export const VENUE_KIND_LABELS: Record<VenueKind, string> = {
  casa_braga: "Casa Braga",
  externo: "Externo",
};

export const YES_NO_LABELS: Record<Exclude<YesNo, "">, string> = {
  sim: "Sim",
  nao: "Não",
};

export const UNIFORM_SIZE_LABELS: Record<UniformSize, string> = {
  p: "P",
  m: "M",
  g: "G",
  gg: "GG",
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
