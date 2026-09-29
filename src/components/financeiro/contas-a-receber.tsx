"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ExcelJS from "exceljs";
import { FileDown, Paperclip, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { KpiCard, StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { applySheetFont } from "@/lib/cadastros/xlsx";
import { formatBRL } from "@/lib/crm/format";
import { formatDateTime, formatShortDate } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import { uid } from "@/lib/event-factory";
import {
  chargeTotal,
  contractedAmount,
  receivedTotal,
  receivableStatus,
  receivableSummary,
  remainingAmount,
  todayIsoSaoPaulo,
} from "@/lib/financeiro/calc";
import {
  RECEIVABLE_CHARGE_KINDS,
  RECEIVABLE_STATUS_LABELS,
  type ContasAReceberData,
  type ReceivableCharge,
  type ReceivableChargeKind,
  type ReceivableMethod,
  type ReceivableReceipt,
  type ReceivableRecord,
  type ReceivableStatus,
} from "@/lib/financeiro/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<ReceivableStatus, StatusTone> = {
  aberto: "info",
  parcial: "warn",
  pago: "ok",
  vencido: "danger",
  cancelado: "neutral",
};

const MAX_RECEIPT_BYTES = Math.round(1.5 * 1024 * 1024);

type StatusFilter = "abertos" | ReceivableStatus | "";

type ChargeDraft = {
  id: string;
  kind: ReceivableChargeKind;
  date: string;
  description: string;
  amount: string;
  createdAt: string;
};

type ReceiptDraft = {
  id: string;
  date: string;
  amount: string;
  method: ReceivableMethod;
  note: string;
  attachmentName: string;
  attachmentDataUrl: string;
  createdAt: string;
};

type Draft = {
  clientId: string;
  eventId: string;
  competence: string;
  notes: string;
  canceled: boolean;
  charges: ChargeDraft[];
  receipts: ReceiptDraft[];
};

function parseAmount(value: string) {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function formatCompetence(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return "—";
  return format(parseISO(`${value}-01`), "MMMM yyyy", { locale: ptBR });
}

function emptyCharge(kind: ReceivableChargeKind, date: string, description = ""): ChargeDraft {
  return { id: uid(), kind, date, description, amount: "", createdAt: new Date().toISOString() };
}

function emptyDraft(today: string): Draft {
  return {
    clientId: "",
    eventId: "",
    competence: today.slice(0, 7),
    notes: "",
    canceled: false,
    charges: [emptyCharge("evento", today, "Fechamento do evento")],
    receipts: [],
  };
}

function chargeFromRecord(charge: ReceivableCharge): ChargeDraft {
  return {
    id: charge.id,
    kind: charge.kind,
    date: charge.date,
    description: charge.description,
    amount: charge.amount ? String(charge.amount) : "",
    createdAt: charge.createdAt,
  };
}

function receiptFromRecord(receipt: ReceivableReceipt): ReceiptDraft {
  return {
    id: receipt.id,
    date: receipt.date,
    amount: receipt.amount ? String(receipt.amount) : "",
    method: receipt.method,
    note: receipt.note,
    attachmentName: receipt.attachmentName,
    attachmentDataUrl: receipt.attachmentDataUrl,
    createdAt: receipt.createdAt,
  };
}

function draftTotals(draft: Draft) {
  let evento = 0;
  let extra = 0;
  for (const charge of draft.charges) {
    const amount = parseAmount(charge.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (charge.kind === "evento") evento += amount;
    else extra += amount;
  }
  const paid = draft.receipts.reduce((sum, receipt) => {
    const amount = parseAmount(receipt.amount);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);
  const total = evento + extra;
  return { evento, extra, total, paid, open: Math.max(0, total - paid) };
}

export function ContasAReceberPage() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const [data, setData] = useState<ContasAReceberData | null>(null);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("abertos");
  const [dateSort, setDateSort] = useState<DateSort>("asc");
  const [editing, setEditing] = useState<ReceivableRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(todayIsoSaoPaulo()));
  const [working, setWorking] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveGen = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/contas-a-receber", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as { data: ContasAReceberData };
      setData(json.data);
    } catch {
      toast.error("Não foi possível carregar as contas a receber.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const persist = useCallback((next: ContasAReceberData) => {
    const generation = ++saveGen.current;
    setData(next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/contas-a-receber", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
        const json = (await res.json()) as { data?: ContasAReceberData };
        if (generation === saveGen.current && json.data) setData(json.data);
      })
      .catch(() => {
        toast.error("Não foi possível salvar as contas a receber.");
      });
  }, []);

  const receivables = useMemo(() => data?.receivables ?? [], [data]);
  const clientes = useMemo(() => cadastros?.clientes ?? [], [cadastros]);
  const clientById = useMemo(() => new Map(clientes.map((item) => [item.id, item])), [clientes]);
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [events],
  );

  const today = todayIsoSaoPaulo();
  const summary = useMemo(() => receivableSummary(receivables, today), [receivables, today]);
  const totals = useMemo(() => draftTotals(draft), [draft]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return receivables
      .map((item) => ({ item, status: receivableStatus(item) }))
      .filter(({ item, status }) => {
        if (statusFilter === "abertos") {
          if (status === "pago" || status === "cancelado") return false;
        } else if (statusFilter && status !== statusFilter) return false;
        if (!term) return true;
        const charges = (item.charges ?? []).map((charge) => charge.description).join(" ");
        return `${item.clientName} ${item.eventTitle} ${item.eventCode} ${item.description} ${charges}`
          .toLowerCase()
          .includes(term);
      })
      .sort(
        (a, b) =>
          compareDateSort(a.item.competence, b.item.competence, dateSort) ||
          a.item.clientName.localeCompare(b.item.clientName, "pt-BR"),
      );
  }, [receivables, search, statusFilter, dateSort]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft(today));
    setFormOpen(true);
  };

  const openEdit = (item: ReceivableRecord) => {
    setEditing(item);
    setDraft({
      clientId: item.clientId,
      eventId: item.eventId,
      competence: item.competence || today.slice(0, 7),
      notes: item.notes,
      canceled: item.canceled,
      charges:
        item.charges.length > 0
          ? item.charges.map(chargeFromRecord)
          : [emptyCharge("evento", item.createdAt.slice(0, 10) || today, "Fechamento do evento")],
      receipts: (item.receipts ?? []).map(receiptFromRecord),
    });
    setFormOpen(true);
  };

  const applyEvent = (eventId: string, current: Draft): Draft => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return { ...current, eventId };
    const clientId = event.clientId && clientById.has(event.clientId) ? event.clientId : current.clientId;
    const competence = event.date ? event.date.slice(0, 7) : current.competence;
    return { ...current, eventId, clientId, competence };
  };

  const updateCharge = (id: string, patch: Partial<ChargeDraft>) => {
    setDraft((current) => ({
      ...current,
      charges: current.charges.map((charge) => (charge.id === id ? { ...charge, ...patch } : charge)),
    }));
  };

  const updateReceipt = (id: string, patch: Partial<ReceiptDraft>) => {
    setDraft((current) => ({
      ...current,
      receipts: current.receipts.map((receipt) => (receipt.id === id ? { ...receipt, ...patch } : receipt)),
    }));
  };

  const attachReceipt = async (id: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      toast.error("O comprovante pode ter no máximo 1,5 MB.");
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Anexe uma imagem ou um PDF.");
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      updateReceipt(id, { attachmentName: file.name, attachmentDataUrl: dataUrl });
    } catch {
      toast.error("Não foi possível ler o comprovante.");
    }
  };

  const saveForm = () => {
    if (!data) return;
    if (!/^\d{4}-\d{2}$/.test(draft.competence)) {
      toast.error("Informe a competência.");
      return;
    }
    const client = clientById.get(draft.clientId);
    const event = events.find((item) => item.id === draft.eventId);
    if (!client && !event) {
      toast.error("Vincule um cliente ou um evento.");
      return;
    }
    const now = new Date().toISOString();
    const charges: ReceivableCharge[] = [];
    for (const charge of draft.charges) {
      const amount = parseAmount(charge.amount);
      if (!charge.amount.trim()) continue;
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Informe um valor válido em cada lançamento.");
        return;
      }
      charges.push({
        id: charge.id,
        kind: charge.kind,
        date: charge.date,
        description: charge.description.trim(),
        amount,
        createdAt: charge.createdAt || now,
      });
    }
    if (charges.length === 0) {
      toast.error("Inclua ao menos o lançamento de fechamento do evento.");
      return;
    }
    const receipts: ReceivableReceipt[] = [];
    for (const receipt of draft.receipts) {
      const amount = parseAmount(receipt.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Informe o valor de cada pagamento.");
        return;
      }
      receipts.push({
        id: receipt.id,
        date: receipt.date || today,
        amount,
        method: receipt.method,
        note: receipt.note.trim(),
        attachmentName: receipt.attachmentDataUrl ? receipt.attachmentName : "",
        attachmentDataUrl: receipt.attachmentDataUrl,
        createdAt: receipt.createdAt || now,
      });
    }
    const amount = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const paid = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    if (paid - amount > 0.009) {
      toast.error(`Os pagamentos somam mais do que o contratado (${formatBRL(amount)}).`);
      return;
    }
    const closing = charges.find((charge) => charge.kind === "evento") ?? charges[0];
    const nextItem: ReceivableRecord = {
      id: editing?.id ?? uid(),
      clientId: client?.id ?? "",
      clientName: client?.name ?? editing?.clientName ?? "",
      eventId: event?.id ?? "",
      eventCode: event?.code ?? editing?.eventCode ?? "",
      eventTitle: event?.title ?? editing?.eventTitle ?? "",
      description: closing?.description || event?.title || client?.name || "Conta a receber",
      amount,
      competence: draft.competence,
      canceled: draft.canceled,
      notes: draft.notes.trim(),
      charges,
      receipts,
      changeLog: editing?.changeLog ?? [],
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    persist({
      receivables: editing
        ? receivables.map((item) => (item.id === editing.id ? nextItem : item))
        : [nextItem, ...receivables],
    });
    setFormOpen(false);
    toast.success(editing ? "Lançamento atualizado." : "Lançamento criado.");
  };

  const removeItem = (item: ReceivableRecord) => {
    if (!window.confirm(`Excluir o lançamento de ${item.clientName || item.description}?`)) return;
    persist({ receivables: receivables.filter((row) => row.id !== item.id) });
    toast.success("Lançamento excluído.");
  };

  const exportSheet = async () => {
    const rows = filtered.length ? filtered : receivables.map((item) => ({ item, status: receivableStatus(item) }));
    if (rows.length === 0) {
      toast.error("Nada para exportar.");
      return;
    }
    try {
      setWorking(true);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Contas a receber");
      const header = sheet.addRow([
        "Cliente",
        "Evento",
        "Competência",
        "Evento (R$)",
        "Extra (R$)",
        "Total",
        "Pago",
        "Em aberto",
        "Status",
      ]);
      header.font = { name: "Poppins", bold: true };
      header.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E443E" } };
        cell.font = { name: "Poppins", bold: true, color: { argb: "FFFFFBFA" } };
      });
      for (const { item, status } of rows) {
        sheet.addRow([
          item.clientName || "—",
          item.eventCode ? `${item.eventCode} · ${item.eventTitle}` : item.eventTitle || "—",
          formatCompetence(item.competence),
          chargeTotal(item, "evento"),
          chargeTotal(item, "extra"),
          contractedAmount(item),
          receivedTotal(item),
          remainingAmount(item),
          RECEIVABLE_STATUS_LABELS[status],
        ]);
      }
      sheet.columns.forEach((column) => {
        column.width = 22;
      });
      for (const index of [4, 5, 6, 7, 8]) sheet.getColumn(index).numFmt = "0.00";
      applySheetFont(sheet);
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `contas-a-receber-${slugify(today)}.xlsx`,
      );
      toast.success("Planilha baixada.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar a planilha.");
    } finally {
      setWorking(false);
    }
  };

  const pageReady = ready && eventsReady && cadReady;

  return (
    <PageShell
      eyebrow="Financeiro"
      title="Contas a receber"
      actions={
        <>
            <Button
              variant="outline"
              disabled={working || receivables.length === 0}
              onClick={() => void exportSheet()}
            >
              <FileDown data-icon="inline-start" />
              Planilha
            </Button>
            <Button className="px-5" onClick={openNew}>
              <Plus data-icon="inline-start" />
              Novo lançamento
            </Button>
        </>
      }
    >

      {!pageReady ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="A receber" value={formatBRL(summary.open)} />
            <KpiCard label="Evento" value={formatBRL(summary.eventTotal)} />
            <KpiCard label="Extra" value={formatBRL(summary.extraTotal)} />
            <KpiCard label="Recebido no mês" value={formatBRL(summary.receivedMonth)} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por cliente, evento ou descrição…" />
            </div>
            <select
              className={cn(fieldControlClass, "h-10 w-auto min-w-[11rem] sm:w-52")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              aria-label="Filtrar por status"
            >
              <option value="abertos">Em aberto</option>
              <option value="">Todos</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Recebido</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <DateSortSelect value={dateSort} onChange={setDateSort} />
          </div>

          {receivables.length === 0 ? (
            <EmptyBlock
              title="Nenhuma conta a receber"
              description="Lance o fechamento do evento e os extras contratados depois. Os pagamentos ficam nesta conta."
              action={
                <Button onClick={openNew}>
                  <Plus data-icon="inline-start" />
                  Novo lançamento
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyBlock title="Nenhum lançamento neste filtro" description="Ajuste a busca ou o status." />
          ) : (
            <Card flush>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="field-label py-3 pl-5 font-normal">Cliente / evento</th>
                    <th className="field-label py-3 font-normal">Competência</th>
                    <th className="field-label py-3 pr-3 text-right font-normal">Valor</th>
                    <th className="field-label py-3 pr-3 text-right font-normal">Pago</th>
                    <th className="field-label py-3 pr-3 text-right font-normal">Em aberto</th>
                    <th className="field-label py-3 pl-3 font-normal">Status</th>
                    <th className="w-28 py-3 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ item, status }) => {
                    const evento = chargeTotal(item, "evento");
                    const extra = chargeTotal(item, "extra");
                    return (
                      <tr key={item.id} className="border-b border-line align-middle last:border-0">
                        <td className="py-3 pl-5 pr-3">
                          <p className="font-medium text-forest">{item.clientName || item.description}</p>
                          <p className="meta-text">
                            {item.eventCode
                              ? `${item.eventCode} · ${item.eventTitle || "Evento"}`
                              : item.description || "Sem evento vinculado"}
                          </p>
                        </td>
                        <td className="py-3 pr-3 capitalize text-forest">{formatCompetence(item.competence)}</td>
                        <td className="py-3 pr-3 text-right tabular text-forest">
                          <p>{formatBRL(contractedAmount(item))}</p>
                          <p className="meta-text">
                            Evento {formatBRL(evento)}
                            {extra > 0 ? ` · Extra ${formatBRL(extra)}` : ""}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-right tabular text-forest">{formatBRL(receivedTotal(item))}</td>
                        <td className={cn("py-3 pr-3 text-right font-medium tabular", status === "vencido" ? "text-danger" : "text-forest")}>
                          {formatBRL(remainingAmount(item))}
                        </td>
                        <td className="py-3 pl-3 pr-3">
                          <StatusPill tone={STATUS_TONE[status]}>{RECEIVABLE_STATUS_LABELS[status]}</StatusPill>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-1">
                            {status !== "pago" && status !== "cancelado" ? (
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-lg text-forest/45 hover:bg-forest/[0.06] hover:text-forest"
                                aria-label={`Registrar pagamento de ${item.clientName || item.description}`}
                                onClick={() => openEdit(item)}
                              >
                                <Wallet className="size-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-lg text-forest/45 hover:bg-forest/[0.06] hover:text-forest"
                              aria-label="Editar lançamento"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-lg text-forest/40 hover:bg-danger/10 hover:text-danger"
                              aria-label="Excluir lançamento"
                              onClick={() => removeItem(item)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </Card>
          )}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar lançamento" : "Novo lançamento"}
        wide
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cliente">
              <select
                className={fieldControlClass}
                value={draft.clientId}
                onChange={(event) => setDraft((current) => ({ ...current, clientId: event.target.value }))}
              >
                <option value="">Sem cliente vinculado</option>
                {[...clientes]
                  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                  .map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Evento">
              <select
                className={fieldControlClass}
                value={draft.eventId}
                onChange={(event) => setDraft((current) => applyEvent(event.target.value, current))}
              >
                <option value="">Sem evento vinculado</option>
                {sortedEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.code} · {event.title || "Sem nome"}
                    {event.date ? ` · ${formatShortDate(event.date)}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Competência">
              <input
                type="month"
                className={fieldControlClass}
                value={draft.competence}
                onChange={(event) => setDraft((current) => ({ ...current, competence: event.target.value }))}
              />
            </Field>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="section-title">Lançamentos</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    charges: [...current.charges, emptyCharge("extra", today)],
                  }))
                }
              >
                <Plus data-icon="inline-start" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {draft.charges.map((charge) => (
                <div key={charge.id} className="rounded-lg border border-line bg-white p-3">
                  <div className="grid items-end gap-3 sm:grid-cols-[8.5rem_9rem_minmax(0,1fr)_7.5rem_auto]">
                    <Field label="Categoria">
                      <select
                        className={fieldControlClass}
                        value={charge.kind}
                        onChange={(event) => updateCharge(charge.id, { kind: event.target.value as ReceivableChargeKind })}
                      >
                        {RECEIVABLE_CHARGE_KINDS.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Data">
                      <input
                        type="date"
                        className={fieldControlClass}
                        value={charge.date}
                        onChange={(event) => updateCharge(charge.id, { date: event.target.value })}
                      />
                    </Field>
                    <Field label="Descrição">
                      <input
                        className={fieldControlClass}
                        value={charge.description}
                        onChange={(event) => updateCharge(charge.id, { description: event.target.value })}
                        placeholder={charge.kind === "evento" ? "Fechamento do evento" : "Convidados, cardápio…"}
                      />
                    </Field>
                    <Field label="Valor (R$)">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={cn(fieldControlClass, "text-right tabular")}
                        value={charge.amount}
                        onChange={(event) => updateCharge(charge.id, { amount: event.target.value })}
                      />
                    </Field>
                    <div className="flex h-10 items-center justify-end">
                      <button
                        type="button"
                        className="flex size-9 items-center justify-center rounded-lg text-forest/40 hover:bg-danger/10 hover:text-danger"
                        aria-label="Remover lançamento"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            charges: current.charges.filter((item) => item.id !== charge.id),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="meta-text tabular">
              Evento {formatBRL(totals.evento)} · Extra {formatBRL(totals.extra)} · Total{" "}
              <span className="font-medium text-forest">{formatBRL(totals.total)}</span>
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="section-title">Pagamentos</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    receipts: [
                      ...current.receipts,
                      {
                        id: uid(),
                        date: today,
                        amount: totals.open > 0 ? String(totals.open) : "",
                        method: "pix",
                        note: "",
                        attachmentName: "",
                        attachmentDataUrl: "",
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  }))
                }
              >
                <Plus data-icon="inline-start" />
                Registrar pagamento
              </Button>
            </div>
            {draft.receipts.length === 0 ? (
              <p className="meta-text">Nenhum pagamento registrado.</p>
            ) : (
              <div className="space-y-3">
                {draft.receipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="grid items-end gap-3 sm:grid-cols-[9rem_8rem_minmax(0,1fr)_auto]">
                      <Field label="Data do pagamento">
                        <input
                          type="date"
                          className={fieldControlClass}
                          value={receipt.date}
                          onChange={(event) => updateReceipt(receipt.id, { date: event.target.value })}
                        />
                      </Field>
                      <Field label="Valor pago (R$)">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={cn(fieldControlClass, "text-right tabular")}
                          value={receipt.amount}
                          onChange={(event) => updateReceipt(receipt.id, { amount: event.target.value })}
                        />
                      </Field>
                      <Field label="Comprovante">
                        <div className="flex h-10 min-w-0 items-center gap-2">
                          <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-forest/15 px-3 text-sm text-forest hover:bg-forest/5">
                            <Paperclip className="size-3.5" />
                            Anexar
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                void attachReceipt(receipt.id, file);
                              }}
                            />
                          </label>
                          {receipt.attachmentDataUrl ? (
                            <a
                              href={receipt.attachmentDataUrl}
                              download={receipt.attachmentName || "comprovante"}
                              className="truncate text-sm text-forest underline underline-offset-2 hover:text-petrol"
                            >
                              {receipt.attachmentName || "Comprovante"}
                            </a>
                          ) : (
                            <span className="meta-text">Sem anexo</span>
                          )}
                        </div>
                      </Field>
                      <div className="flex h-10 items-center justify-end">
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-lg text-forest/40 hover:bg-danger/10 hover:text-danger"
                          aria-label="Remover pagamento"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              receipts: current.receipts.filter((item) => item.id !== receipt.id),
                            }))
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="meta-text tabular">
              Pago {formatBRL(totals.paid)} · Em aberto <span className="font-medium text-forest">{formatBRL(totals.open)}</span>
            </p>
          </section>

          <Field label="Observações">
            <textarea
              className={cn(fieldControlClass, "min-h-20 py-2")}
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-forest/70">
            <input
              type="checkbox"
              className="size-4 accent-forest"
              checked={draft.canceled}
              onChange={(event) => setDraft((current) => ({ ...current, canceled: event.target.checked }))}
            />
            Cancelar este lançamento
          </label>

          {editing && (editing.changeLog ?? []).length > 0 ? (
            <section className="space-y-2">
              <h3 className="section-title">Histórico</h3>
              <ul className="space-y-2">
                {[...editing.changeLog].reverse().map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-line bg-white px-3 py-2">
                    <p className="meta-text">
                      {formatDateTime(entry.at)}
                      {entry.userName ? ` · ${entry.userName}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-forest/80">{entry.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="px-5" onClick={saveForm}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
