import type { ReceivableRecord, ReceivableStatus } from "./types";

export function todayIsoSaoPaulo() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function receivedTotal(item: ReceivableRecord) {
  return (item.receipts ?? []).reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
}

export function remainingAmount(item: ReceivableRecord) {
  return Math.max(0, (item.amount || 0) - receivedTotal(item));
}

export function receivableStatus(item: ReceivableRecord, today = todayIsoSaoPaulo()): ReceivableStatus {
  if (item.canceled) return "cancelado";
  const remaining = remainingAmount(item);
  if (remaining <= 0 && (item.amount || 0) > 0) return "pago";
  if (item.dueDate && item.dueDate < today && remaining > 0) return "vencido";
  if (receivedTotal(item) > 0) return "parcial";
  return "aberto";
}

export function receivableSummary(items: ReceivableRecord[], today = todayIsoSaoPaulo()) {
  const month = today.slice(0, 7);
  let open = 0;
  let overdue = 0;
  let receivedMonth = 0;
  let issued = 0;
  for (const item of items) {
    if (item.canceled) continue;
    issued += item.amount || 0;
    const remaining = remainingAmount(item);
    const status = receivableStatus(item, today);
    if (status !== "pago") open += remaining;
    if (status === "vencido") overdue += remaining;
    for (const receipt of item.receipts ?? []) {
      if ((receipt.date || "").slice(0, 7) === month) receivedMonth += receipt.amount || 0;
    }
  }
  return { open, overdue, receivedMonth, issued };
}
