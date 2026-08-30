export type LeadOutcome = "won" | "lost" | "open";

export const LOSS_REASONS = [
  "Comprado do concorrente",
  "Data indisponível",
  "Desistência de evento",
  "Evento não se enquadra com buffet",
  "Produto não se encaixa",
  "Orçamento insuficiente",
  "Sem retorno do cliente",
  "Outros",
  "Sem Motivo",
] as const;

export type LossReason = (typeof LOSS_REASONS)[number];

export const CRM_EVENT_TYPES = [
  "Aniversário",
  "Casamento",
  "Corporativo",
  "Social",
  "Encomenda",
] as const;

export type CrmEventType = (typeof CRM_EVENT_TYPES)[number];

export const EVENT_LOCATIONS = ["Buffet Móvel", "Casa Braga"] as const;

export type EventLocation = (typeof EVENT_LOCATIONS)[number];

/**
 * The eight stages of the "Funil - Comercial" pipeline, in the order a lead
 * travels through it. The last two are terminal (closed) stages.
 */
export const PIPELINE_STAGES = [
  "Qualificação",
  "Orçamento em Elaboração",
  "Orçamento Enviado",
  "Degustação",
  "Negociação",
  "A Confirmar",
  "Venda Ganha",
  "Venda Perdida",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const OPEN_PIPELINE_STAGES = PIPELINE_STAGES.filter(
  (stage) => stage !== "Venda Ganha" && stage !== "Venda Perdida",
);

export interface LeadRecord {
  id: string;
  title: string;
  /** Original "Etapa do lead" value straight from the spreadsheet. */
  stageRaw: string;
  /** Normalized current pipeline stage. */
  stage: string;
  outcome: LeadOutcome;
  lossReason: LossReason | null;
  /** Sale value in BRL (reais). */
  value: number;
  /** ISO date the lead entered the funnel ("Data Criada"). */
  createdAt: string | null;
  /** ISO date the lead was won/lost ("Fechada em"), null while open. */
  closedAt: string | null;
  seller: string | null;
  location: EventLocation | null;
  eventType: CrmEventType | null;
  guests: number | null;
  origin: string | null;
  /** ISO date of the event itself ("Data do Evento"). */
  eventDate: string | null;
}

export interface CrmSnapshot {
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  leads: LeadRecord[];
}
