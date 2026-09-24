import { normalizeLaborExtras, type EventLaborAllocation } from "@/lib/types";
import {
  laborFunctionLabel,
  workerFunctionKeys,
  type ExternalWorker,
  type LaborPayment,
  type LaborRate,
  type MaoDeObraData,
} from "./types";

export type EventLaborExtras = {
  overtime: boolean;
  overtimeHours: number;
  applyAllowance: boolean;
};

export function eventLaborExtras(event: {
  laborOvertime?: boolean;
  laborOvertimeHours?: number;
  laborApplyAllowance?: boolean;
  outOfTown?: boolean;
  laborAllocations?: EventLaborAllocation[];
}): EventLaborExtras {
  const extras = normalizeLaborExtras(event);
  return {
    overtime: extras.laborOvertime,
    overtimeHours: extras.laborOvertimeHours,
    applyAllowance: extras.laborApplyAllowance,
  };
}

export function rateFor(rates: LaborRate[], functionKey: string): LaborRate {
  return (
    rates.find((rate) => rate.functionKey === functionKey) ?? {
      functionKey,
      daily: 0,
      overtimeHourly: 0,
      allowance: 0,
    }
  );
}

export function laborLineAmounts(
  allocation: EventLaborAllocation,
  rate: LaborRate,
  extras: EventLaborExtras,
) {
  const overtimeHours = extras.overtime ? Math.max(0, extras.overtimeHours || 0) : 0;
  const overtimeAmount = overtimeHours * (rate.overtimeHourly || 0);
  const allowance = extras.applyAllowance ? rate.allowance || 0 : 0;
  const daily =
    typeof allocation.daily === "number" && Number.isFinite(allocation.daily)
      ? allocation.daily
      : rate.daily || 0;
  return {
    daily,
    overtimeHours,
    overtimeAmount,
    allowance,
    total: daily + overtimeAmount + allowance,
  };
}

export function paymentIdFor(eventId: string, workerId: string) {
  return `pay-${eventId}-${workerId}`;
}

export function paymentFromAllocation(input: {
  event: {
    id: string;
    code: string;
    title: string;
    date: string;
    outOfTown?: boolean;
    laborOvertime?: boolean;
    laborOvertimeHours?: number;
    laborApplyAllowance?: boolean;
    laborAllocations?: EventLaborAllocation[];
  };
  allocation: EventLaborAllocation;
  worker: ExternalWorker;
  rates: LaborRate[];
  previous?: LaborPayment | null;
}): LaborPayment {
  const rate = rateFor(input.rates, input.allocation.functionKey || workerFunctionKeys(input.worker)[0] || "");
  const amounts = laborLineAmounts(
    { ...input.allocation, functionKey: rate.functionKey },
    rate,
    eventLaborExtras(input.event),
  );
  const now = new Date().toISOString();
  return {
    id: paymentIdFor(input.event.id, input.worker.id),
    eventId: input.event.id,
    eventCode: input.event.code,
    eventTitle: input.event.title,
    eventDate: input.event.date,
    workerId: input.worker.id,
    workerName: input.worker.name,
    workerCpf: input.worker.cpf,
    pix: input.worker.pix,
    functionKey: rate.functionKey,
    functionLabel: laborFunctionLabel(rate.functionKey),
    ...amounts,
    status: input.previous?.status === "pago" || input.previous?.status === "exportado"
      ? input.previous.status
      : "aberto",
    createdAt: input.previous?.createdAt ?? now,
    updatedAt: now,
  };
}

export function groupLaborPaymentsByEvent(payments: LaborPayment[]) {
  const map = new Map<
    string,
    {
      eventId: string;
      eventCode: string;
      eventTitle: string;
      eventDate: string;
      payments: LaborPayment[];
      teamAmount: number;
      overtimeAmount: number;
      allowanceAmount: number;
      total: number;
    }
  >();
  for (const payment of payments) {
    const current = map.get(payment.eventId) ?? {
      eventId: payment.eventId,
      eventCode: payment.eventCode,
      eventTitle: payment.eventTitle,
      eventDate: payment.eventDate,
      payments: [] as LaborPayment[],
      teamAmount: 0,
      overtimeAmount: 0,
      allowanceAmount: 0,
      total: 0,
    };
    current.payments.push(payment);
    current.teamAmount += payment.daily || 0;
    current.overtimeAmount += payment.overtimeAmount || 0;
    current.allowanceAmount += payment.allowance || 0;
    current.total += payment.total || 0;
    map.set(payment.eventId, current);
  }
  return [...map.values()].sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || "") || a.eventTitle.localeCompare(b.eventTitle, "pt-BR"));
}

export function syncPaymentsFromEvents(
  data: MaoDeObraData,
  events: Array<{
    id: string;
    code: string;
    title: string;
    date: string;
    outOfTown?: boolean;
    laborOvertime?: boolean;
    laborOvertimeHours?: number;
    laborApplyAllowance?: boolean;
    laborAllocations?: EventLaborAllocation[];
  }>,
): MaoDeObraData {
  const workers = new Map(data.workers.map((worker) => [worker.id, worker]));
  const previousById = new Map(data.payments.map((payment) => [payment.id, payment]));
  const eventIds = new Set(events.map((event) => event.id));
  const next = new Map<string, LaborPayment>();
  const allocatedIds = new Set<string>();
  for (const event of events) {
    for (const allocation of event.laborAllocations ?? []) {
      allocatedIds.add(paymentIdFor(event.id, allocation.workerId));
    }
  }
  const dismissed = new Set((data.dismissedPaymentIds ?? []).filter((id) => allocatedIds.has(id)));

  for (const payment of data.payments) {
    if (eventIds.has(payment.eventId)) continue;
    if (payment.status === "pago" || payment.status === "exportado") {
      next.set(payment.id, payment);
    }
  }

  for (const event of events) {
    const allocations = event.laborAllocations ?? [];
    const allocated = new Set(allocations.map((item) => item.workerId));
    for (const payment of data.payments) {
      if (payment.eventId !== event.id) continue;
      if (allocated.has(payment.workerId)) continue;
      if (payment.status === "pago" || payment.status === "exportado") {
        next.set(payment.id, payment);
      }
    }
    for (const allocation of allocations) {
      const worker = workers.get(allocation.workerId);
      if (!worker) continue;
      const id = paymentIdFor(event.id, worker.id);
      if (dismissed.has(id)) continue;
      next.set(
        id,
        paymentFromAllocation({
          event,
          allocation,
          worker,
          rates: data.rates,
          previous: previousById.get(id) ?? null,
        }),
      );
    }
  }

  return { ...data, payments: [...next.values()], dismissedPaymentIds: [...dismissed] };
}
