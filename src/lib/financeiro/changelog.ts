import { formatBRL } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import type { ReceivableCharge, ReceivableRecord, ReceivableReceipt } from "./types";

const MAX_ENTRIES = 80;

function money(value: number) {
  return formatBRL(value || 0);
}

function day(value: string) {
  return value ? formatShortDate(value) : "sem data";
}

function monthLabel(value: string) {
  if (!value) return "sem competência";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return `${month}/${year}`;
}

function chargeLine(charge: ReceivableCharge) {
  const kind = charge.kind === "evento" ? "Evento" : "Extra";
  const text = charge.description ? ` — ${charge.description}` : "";
  return `${kind} ${money(charge.amount)} em ${day(charge.date)}${text}`;
}

function receiptLine(receipt: ReceivableReceipt) {
  const file = receipt.attachmentName ? ` · ${receipt.attachmentName}` : "";
  return `Pagamento ${money(receipt.amount)} em ${day(receipt.date)}${file}`;
}

function diff(previous: ReceivableRecord, next: ReceivableRecord) {
  const lines: string[] = [];
  if (previous.competence !== next.competence) {
    lines.push(`Competência: ${monthLabel(previous.competence)} → ${monthLabel(next.competence)}`);
  }
  if (previous.clientName !== next.clientName) {
    lines.push(`Cliente: ${previous.clientName || "—"} → ${next.clientName || "—"}`);
  }
  if (previous.eventTitle !== next.eventTitle || previous.eventCode !== next.eventCode) {
    lines.push(`Evento: ${previous.eventCode || previous.eventTitle || "—"} → ${next.eventCode || next.eventTitle || "—"}`);
  }
  if (previous.notes !== next.notes) lines.push("Observações alteradas.");
  if (previous.canceled !== next.canceled) {
    lines.push(next.canceled ? "Conta cancelada." : "Conta reaberta.");
  }

  const previousCharges = previous.charges ?? [];
  const nextCharges = next.charges ?? [];
  const beforeCharges = new Map(previousCharges.map((item) => [item.id, item]));
  const afterCharges = new Map(nextCharges.map((item) => [item.id, item]));
  for (const charge of nextCharges) {
    const prior = beforeCharges.get(charge.id);
    if (!prior) lines.push(`Lançamento incluído: ${chargeLine(charge)}`);
    else if (
      prior.amount !== charge.amount ||
      prior.date !== charge.date ||
      prior.description !== charge.description ||
      prior.kind !== charge.kind
    ) {
      lines.push(`Lançamento alterado: ${chargeLine(prior)} → ${chargeLine(charge)}`);
    }
  }
  for (const charge of previousCharges) {
    if (!afterCharges.has(charge.id)) lines.push(`Lançamento removido: ${chargeLine(charge)}`);
  }

  const previousReceipts = previous.receipts ?? [];
  const nextReceipts = next.receipts ?? [];
  const beforeReceipts = new Map(previousReceipts.map((item) => [item.id, item]));
  const afterReceipts = new Map(nextReceipts.map((item) => [item.id, item]));
  for (const receipt of nextReceipts) {
    const prior = beforeReceipts.get(receipt.id);
    if (!prior) lines.push(`Pagamento registrado: ${receiptLine(receipt)}`);
    else if (
      prior.amount !== receipt.amount ||
      prior.date !== receipt.date ||
      prior.attachmentName !== receipt.attachmentName ||
      prior.method !== receipt.method ||
      prior.note !== receipt.note
    ) {
      lines.push(`Pagamento alterado: ${receiptLine(prior)} → ${receiptLine(receipt)}`);
    }
  }
  for (const receipt of previousReceipts) {
    if (!afterReceipts.has(receipt.id)) lines.push(`Pagamento removido: ${receiptLine(receipt)}`);
  }
  return lines;
}

export function applyReceivableHistory(
  previous: ReceivableRecord[],
  next: ReceivableRecord[],
  user: { id: string; name: string },
) {
  const before = new Map(previous.map((item) => [item.id, item]));
  const at = new Date().toISOString();
  return next.map((item) => {
    const prior = before.get(item.id);
    const log = [...(prior?.changeLog ?? [])];
    const lines = prior ? diff(prior, item) : ["Conta criada."];
    if (lines.length === 0) return { ...item, changeLog: log };
    log.push({
      id: uid(),
      at,
      userId: user.id,
      userName: user.name,
      summary: lines.join(" · "),
    });
    return { ...item, changeLog: log.slice(-MAX_ENTRIES) };
  });
}
