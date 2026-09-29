import type { ReceivableChargeKind, ReceivableRecord, ReceivableStatus } from "./types";

export function todayIsoSaoPaulo() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function chargeTotal(item: ReceivableRecord, kind?: ReceivableChargeKind) {
  return (item.charges ?? [])
    .filter((charge) => !kind || charge.kind === kind)
    .reduce((sum, charge) => sum + (charge.amount || 0), 0);
}

export function contractedAmount(item: ReceivableRecord) {
  if ((item.charges ?? []).length > 0) return chargeTotal(item);
  return item.amount || 0;
}

export function receivedTotal(item: ReceivableRecord) {
  return (item.receipts ?? []).reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
}

export function remainingAmount(item: ReceivableRecord) {
  return Math.max(0, contractedAmount(item) - receivedTotal(item));
}

export function receivableStatus(item: ReceivableRecord): ReceivableStatus {
  if (item.canceled) return "cancelado";
  const contracted = contractedAmount(item);
  const remaining = remainingAmount(item);
  if (remaining <= 0 && contracted > 0) return "pago";
  if (receivedTotal(item) > 0) return "parcial";
  return "aberto";
}

export function receivableSummary(items: ReceivableRecord[], today = todayIsoSaoPaulo()) {
  const month = today.slice(0, 7);
  let open = 0;
  let eventTotal = 0;
  let extraTotal = 0;
  let receivedMonth = 0;
  let issued = 0;
  for (const item of items) {
    if (item.canceled) continue;
    issued += contractedAmount(item);
    eventTotal += chargeTotal(item, "evento");
    extraTotal += chargeTotal(item, "extra");
    const remaining = remainingAmount(item);
    const status = receivableStatus(item);
    if (status !== "pago") open += remaining;
    for (const receipt of item.receipts ?? []) {
      if ((receipt.date || "").slice(0, 7) === month) receivedMonth += receipt.amount || 0;
    }
  }
  return { open, eventTotal, extraTotal, receivedMonth, issued, overdue: 0 };
}
