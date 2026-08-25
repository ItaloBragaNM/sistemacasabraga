import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CRM_EVENT_TYPES,
  EVENT_LOCATIONS,
  LOSS_REASONS,
  PIPELINE_STAGES,
  type CrmEventType,
  type EventLocation,
  type LeadRecord,
  type LossReason,
} from "./types";

export type PeriodMode = "month" | "week" | "custom";

export interface Period {
  mode: PeriodMode;
  start: Date;
  end: Date;
}

export function resolvePeriod(
  mode: PeriodMode,
  reference: Date,
  custom?: { start?: string; end?: string },
): Period {
  if (mode === "week") {
    return {
      mode,
      start: startOfWeek(reference, { weekStartsOn: 0 }),
      end: endOfWeek(reference, { weekStartsOn: 0 }),
    };
  }
  if (mode === "custom") {
    const start = custom?.start ? startOfDay(new Date(`${custom.start}T00:00:00`)) : startOfMonth(reference);
    const end = custom?.end ? endOfDay(new Date(`${custom.end}T00:00:00`)) : endOfMonth(reference);
    return { mode, start, end };
  }
  return {
    mode: "month",
    start: startOfMonth(reference),
    end: endOfMonth(reference),
  };
}

function inRange(iso: string | null, period: Period): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= period.start.getTime() && time <= period.end.getTime();
}

function isBefore(iso: string | null, date: Date): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < date.getTime();
}

export interface SalesSummary {
  totalWon: number;
  wonCount: number;
  ticket: number;
  totalLost: number;
  lostCount: number;
}

export function summarize(leads: LeadRecord[]): SalesSummary {
  let totalWon = 0;
  let wonCount = 0;
  let totalLost = 0;
  let lostCount = 0;
  for (const lead of leads) {
    if (lead.outcome === "won") {
      totalWon += lead.value;
      wonCount += 1;
    } else if (lead.outcome === "lost") {
      totalLost += lead.value;
      lostCount += 1;
    }
  }
  return {
    totalWon,
    wonCount,
    ticket: wonCount > 0 ? totalWon / wonCount : 0,
    totalLost,
    lostCount,
  };
}

export interface Conversion {
  decidedValue: number;
  decidedCount: number;
  wonValuePct: number;
  lostValuePct: number;
  wonCountPct: number;
  lostCountPct: number;
}

export function conversion(summary: SalesSummary): Conversion {
  const decidedValue = summary.totalWon + summary.totalLost;
  const decidedCount = summary.wonCount + summary.lostCount;
  return {
    decidedValue,
    decidedCount,
    wonValuePct: decidedValue > 0 ? summary.totalWon / decidedValue : 0,
    lostValuePct: decidedValue > 0 ? summary.totalLost / decidedValue : 0,
    wonCountPct: decidedCount > 0 ? summary.wonCount / decidedCount : 0,
    lostCountPct: decidedCount > 0 ? summary.lostCount / decidedCount : 0,
  };
}

export interface Segment<T extends string> {
  key: T;
  summary: SalesSummary;
  winRateCount: number;
  winRateValue: number;
}

function segmentBy<T extends string>(
  leads: LeadRecord[],
  keys: readonly T[],
  accessor: (lead: LeadRecord) => T | null,
): Segment<T>[] {
  return keys.map((key) => {
    const subset = leads.filter((lead) => accessor(lead) === key);
    const summary = summarize(subset);
    const conv = conversion(summary);
    return {
      key,
      summary,
      winRateCount: conv.wonCountPct,
      winRateValue: conv.wonValuePct,
    };
  });
}

export interface ReasonBreakdown {
  reason: LossReason;
  value: number;
  count: number;
  valuePct: number;
}

function breakdownByReason(lostLeads: LeadRecord[]): ReasonBreakdown[] {
  const totalLost = lostLeads.reduce((sum, lead) => sum + lead.value, 0);
  return LOSS_REASONS.map((reason) => {
    const subset = lostLeads.filter((lead) => lead.lossReason === reason);
    const value = subset.reduce((sum, lead) => sum + lead.value, 0);
    return {
      reason,
      value,
      count: subset.length,
      valuePct: totalLost > 0 ? value / totalLost : 0,
    };
  })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.value - a.value);
}

export interface SellerReport {
  seller: string;
  summary: SalesSummary;
  conversion: Conversion;
  reasons: ReasonBreakdown[];
}

export interface PipelineStageStat {
  stage: string;
  count: number;
  value: number;
  isClosed: boolean;
}

export interface DashboardData {
  period: Period;
  closedCount: number;
  // Block 1
  overall: SalesSummary;
  // Block 2
  byLocation: Segment<EventLocation>[];
  locationMissing: SalesSummary;
  byType: Segment<CrmEventType>[];
  typeMissing: SalesSummary;
  lostWithoutType: number;
  // Block 3
  conversion: Conversion;
  winRateByType: Segment<CrmEventType>[];
  // Block 4
  reasons: ReasonBreakdown[];
  reasonsByType: { type: CrmEventType; reasons: ReasonBreakdown[]; totalLost: number }[];
  // Block 5
  sellers: SellerReport[];
  // Block 6
  leadsCreated: number;
  createdAndClosed: number;
  closedFromPrevious: number;
  pipeline: PipelineStageStat[];
  pipelineOpenTotal: { count: number; value: number };
}

function listSellers(leads: LeadRecord[]): string[] {
  const set = new Set<string>();
  let hasNull = false;
  for (const lead of leads) {
    if (lead.outcome === "open") continue;
    if (lead.seller) set.add(lead.seller);
    else hasNull = true;
  }
  const known = ["Natalia Silveira", "Luana Estrela"];
  const ordered = [
    ...known.filter((name) => set.has(name)),
    ...[...set].filter((name) => !known.includes(name)).sort(),
  ];
  if (hasNull) ordered.push("Sem vendedor");
  return ordered;
}

export function computeDashboard(leads: LeadRecord[], period: Period): DashboardData {
  const closedInPeriod = leads.filter(
    (lead) => lead.outcome !== "open" && inRange(lead.closedAt, period),
  );
  const lostInPeriod = closedInPeriod.filter((lead) => lead.outcome === "lost");

  const overall = summarize(closedInPeriod);

  const byLocation = segmentBy(closedInPeriod, EVENT_LOCATIONS, (lead) => lead.location);
  const byType = segmentBy(closedInPeriod, CRM_EVENT_TYPES, (lead) => lead.eventType);
  const lostWithoutType = lostInPeriod.filter((lead) => !lead.eventType).length;

  const reasonsByType = CRM_EVENT_TYPES.map((type) => {
    const subset = lostInPeriod.filter((lead) => lead.eventType === type);
    return {
      type,
      reasons: breakdownByReason(subset),
      totalLost: subset.reduce((sum, lead) => sum + lead.value, 0),
    };
  });

  const sellers = listSellers(closedInPeriod).map<SellerReport>((seller) => {
    const subset = closedInPeriod.filter((lead) =>
      seller === "Sem vendedor" ? !lead.seller : lead.seller === seller,
    );
    const summary = summarize(subset);
    return {
      seller,
      summary,
      conversion: conversion(summary),
      reasons: breakdownByReason(subset.filter((lead) => lead.outcome === "lost")),
    };
  });

  const pipeline: PipelineStageStat[] = PIPELINE_STAGES.map((stage) => {
    const subset = leads.filter((lead) => lead.stage === stage);
    return {
      stage,
      count: subset.length,
      value: subset.reduce((sum, lead) => sum + lead.value, 0),
      isClosed: stage === "Venda Ganha" || stage === "Venda Perdida",
    };
  });
  const openStages = pipeline.filter((stat) => !stat.isClosed);

  return {
    period,
    closedCount: closedInPeriod.length,
    overall,
    byLocation,
    locationMissing: summarize(closedInPeriod.filter((lead) => !lead.location)),
    byType,
    typeMissing: summarize(closedInPeriod.filter((lead) => !lead.eventType)),
    lostWithoutType,
    conversion: conversion(overall),
    winRateByType: byType,
    reasons: breakdownByReason(lostInPeriod),
    reasonsByType,
    sellers,
    leadsCreated: leads.filter((lead) => inRange(lead.createdAt, period)).length,
    createdAndClosed: closedInPeriod.filter((lead) => inRange(lead.createdAt, period)).length,
    closedFromPrevious: closedInPeriod.filter((lead) => isBefore(lead.createdAt, period.start))
      .length,
    pipeline,
    pipelineOpenTotal: {
      count: openStages.reduce((sum, stat) => sum + stat.count, 0),
      value: openStages.reduce((sum, stat) => sum + stat.value, 0),
    },
  };
}
