"use client";

import ExcelJS from "exceljs";
import { FileDown, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { applySheetFont } from "@/lib/cadastros/xlsx";
import { formatBRL } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import { downloadBlob, slugify } from "@/lib/download";
import { uid } from "@/lib/event-factory";
import {
  receivedTotal,
  receivableStatus,
  receivableSummary,
  remainingAmount,
  todayIsoSaoPaulo,
} from "@/lib/financeiro/calc";
import {
  RECEIVABLE_METHODS,
  RECEIVABLE_STATUS_LABELS,
  receivableMethodLabel,
  type ContasAReceberData,
  type ReceivableMethod,
  type ReceivableRecord,
  type ReceivableStatus,
} from "@/lib/financeiro/types";
import { cn } from "@/lib/utils";

const STATUS_CHIP: Record<ReceivableStatus, string> = {
  aberto: "bg-petrol/10 text-petrol",
  parcial: "bg-amber-100 text-amber-900",
  pago: "bg-forest/10 text-forest",
  vencido: "bg-terracotta/10 text-terracotta",
  cancelado: "bg-forest/8 text-forest/50",
};

type StatusFilter = "abertos" | ReceivableStatus | "";

type Draft = {
  clientId: string;
  eventId: string;
  description: string;
  amount: string;
  dueDate: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  clientId: "",
  eventId: "",
  description: "",
  amount: "",
  dueDate: "",
  notes: "",
});

export function ContasAReceberPage() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const [data, setData] = useState<ContasAReceberData | null>(null);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("abertos");
  const [editing, setEditing] = useState<ReceivableRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [receiptFor, setReceiptFor] = useState<ReceivableRecord | null>(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptMethod, setReceiptMethod] = useState<ReceivableMethod>("pix");
  const [receiptNote, setReceiptNote] = useState("");
  const [working, setWorking] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

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
      })
      .catch(() => {
        toast.error("Não foi possível salvar as contas a receber.");
      });
  }, []);

  const receivables = data?.receivables ?? [];
  const clientes = cadastros?.clientes ?? [];
  const clientById = useMemo(() => new Map(clientes.map((item) => [item.id, item])), [clientes]);
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [events],
  );

  const today = todayIsoSaoPaulo();
  const summary = useMemo(() => receivableSummary(receivables, today), [receivables, today]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return receivables
      .map((item) => ({ item, status: receivableStatus(item, today) }))
      .filter(({ item, status }) => {
        if (statusFilter === "abertos") {
          if (status === "pago" || status === "cancelado") return false;
        } else if (statusFilter && status !== statusFilter) return false;
        if (!term) return true;
        return `${item.clientName} ${item.eventTitle} ${item.eventCode} ${item.description}`
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => (a.item.dueDate || "").localeCompare(b.item.dueDate || "") || a.item.clientName.localeCompare(b.item.clientName, "pt-BR"));
  }, [receivables, search, statusFilter, today]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setFormOpen(true);
  };

  const openEdit = (item: ReceivableRecord) => {
    setEditing(item);
    setDraft({
      clientId: item.clientId,
      eventId: item.eventId,
      description: item.description,
      amount: item.amount ? String(item.amount) : "",
      dueDate: item.dueDate,
      notes: item.notes,
    });
    setFormOpen(true);
  };

  const applyEvent = (eventId: string, current: Draft): Draft => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return { ...current, eventId };
    const clientId = event.clientId && clientById.has(event.clientId) ? event.clientId : current.clientId;
    return {
      ...current,
      eventId,
      clientId,
      description: current.description.trim() || event.title || event.code,
      dueDate: current.dueDate || event.date || "",
    };
  };

  const saveForm = () => {
    if (!data) return;
    const amount = Number(draft.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Informe o valor da conta.");
      return;
    }
    if (!draft.dueDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }
    const client = clientById.get(draft.clientId);
    const event = events.find((item) => item.id === draft.eventId);
    if (!client && !draft.description.trim() && !event) {
      toast.error("Vincule um cliente ou um evento.");
      return;
    }
    const now = new Date().toISOString();
    const nextItem: ReceivableRecord = {
      id: editing?.id ?? uid(),
      clientId: client?.id ?? "",
      clientName: client?.name ?? editing?.clientName ?? "",
      eventId: event?.id ?? "",
      eventCode: event?.code ?? editing?.eventCode ?? "",
      eventTitle: event?.title ?? editing?.eventTitle ?? "",
      description: draft.description.trim() || event?.title || client?.name || "Conta a receber",
      amount,
      dueDate: draft.dueDate,
      canceled: editing?.canceled ?? false,
      notes: draft.notes.trim(),
      receipts: editing?.receipts ?? [],
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

  const openReceipt = (item: ReceivableRecord) => {
    const remaining = remainingAmount(item);
    if (remaining <= 0) {
      toast.message("Esta conta já foi recebida.");
      return;
    }
    setReceiptFor(item);
    setReceiptAmount(String(remaining));
    setReceiptDate(today);
    setReceiptMethod("pix");
    setReceiptNote("");
  };

  const saveReceipt = () => {
    if (!data || !receiptFor) return;
    const amount = Number(receiptAmount.replace(",", "."));
    const remaining = remainingAmount(receiptFor);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Informe o valor recebido.");
      return;
    }
    if (amount - remaining > 0.009) {
      toast.error(`O saldo em aberto é ${formatBRL(remaining)}.`);
      return;
    }
    const receipt = {
      id: uid(),
      date: receiptDate || today,
      amount,
      method: receiptMethod,
      note: receiptNote.trim(),
      createdAt: new Date().toISOString(),
    };
    persist({
      receivables: receivables.map((item) =>
        item.id === receiptFor.id
          ? { ...item, receipts: [...item.receipts, receipt], updatedAt: new Date().toISOString() }
          : item,
      ),
    });
    setReceiptFor(null);
    toast.success("Recebimento registrado.");
  };

  const removeItem = (item: ReceivableRecord) => {
    if (!window.confirm(`Excluir o lançamento de ${item.clientName || item.description}?`)) return;
    persist({ receivables: receivables.filter((row) => row.id !== item.id) });
    toast.success("Lançamento excluído.");
  };

  const toggleCancel = (item: ReceivableRecord) => {
    persist({
      receivables: receivables.map((row) =>
        row.id === item.id ? { ...row, canceled: !row.canceled, updatedAt: new Date().toISOString() } : row,
      ),
    });
    toast.success(item.canceled ? "Lançamento reaberto." : "Lançamento cancelado.");
  };

  const exportSheet = async () => {
    const rows = filtered.length ? filtered : receivables.map((item) => ({ item, status: receivableStatus(item, today) }));
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
        "Descrição",
        "Vencimento",
        "Valor",
        "Recebido",
        "Saldo",
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
          item.description,
          item.dueDate ? formatShortDate(item.dueDate) : "",
          item.amount,
          receivedTotal(item),
          remainingAmount(item),
          RECEIVABLE_STATUS_LABELS[status],
        ]);
      }
      sheet.columns.forEach((column) => {
        column.width = 24;
      });
      sheet.getColumn(5).numFmt = "0.00";
      sheet.getColumn(6).numFmt = "0.00";
      sheet.getColumn(7).numFmt = "0.00";
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
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Financeiro"
        title="Contas a receber"
        action={
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10"
              disabled={working || receivables.length === 0}
              onClick={() => void exportSheet()}
            >
              <FileDown data-icon="inline-start" />
              Planilha
            </Button>
            <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={openNew}>
              <Plus data-icon="inline-start" />
              Novo lançamento
            </Button>
          </div>
        }
      />

      {!pageReady ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="A receber" value={formatBRL(summary.open)} />
            <SummaryCard label="Vencido" value={formatBRL(summary.overdue)} warn={summary.overdue > 0} />
            <SummaryCard label="Recebido no mês" value={formatBRL(summary.receivedMonth)} />
            <SummaryCard label="Total lançado" value={formatBRL(summary.issued)} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
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
              <option value="vencido">Vencido</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Recebido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {receivables.length === 0 ? (
            <EmptyBlock
              title="Nenhuma conta a receber"
              description="Lance o valor combinado com o cliente e registre as baixas conforme o dinheiro entrar."
              action={
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={openNew}>
                  <Plus data-icon="inline-start" />
                  Novo lançamento
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyBlock title="Nenhum lançamento neste filtro" description="Ajuste a busca ou o status." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-forest/10 bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="field-label py-3 pl-5 font-normal">Cliente / evento</th>
                    <th className="field-label py-3 font-normal">Vencimento</th>
                    <th className="field-label py-3 font-normal">Valor</th>
                    <th className="field-label py-3 font-normal">Saldo</th>
                    <th className="field-label py-3 font-normal">Status</th>
                    <th className="w-28 py-3 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ item, status }) => {
                    const remaining = remainingAmount(item);
                    return (
                      <tr key={item.id} className="border-b border-forest/5 last:border-0">
                        <td className="py-3 pl-5 pr-3">
                          <p className="font-medium text-forest">{item.clientName || item.description}</p>
                          <p className="text-xs font-light text-forest/45">
                            {item.eventCode
                              ? `${item.eventCode} · ${item.eventTitle || "Evento"}`
                              : item.description && item.clientName
                                ? item.description
                                : "Sem evento vinculado"}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-forest">
                          {item.dueDate ? formatShortDate(item.dueDate) : "—"}
                        </td>
                        <td className="py-3 pr-3 text-forest">{formatBRL(item.amount)}</td>
                        <td className="py-3 pr-3 font-medium text-forest">{formatBRL(remaining)}</td>
                        <td className="py-3 pr-3">
                          <Chip className={STATUS_CHIP[status]}>{RECEIVABLE_STATUS_LABELS[status]}</Chip>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-1">
                            {status !== "pago" && status !== "cancelado" ? (
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-lg text-forest/45 hover:bg-forest/8 hover:text-forest"
                                aria-label={`Registrar recebimento de ${item.clientName || item.description}`}
                                onClick={() => openReceipt(item)}
                              >
                                <Wallet className="size-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-lg text-forest/45 hover:bg-forest/8 hover:text-forest"
                              aria-label="Editar lançamento"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center rounded-lg text-forest/40 hover:bg-terracotta/10 hover:text-terracotta"
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
          )}
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar lançamento" : "Novo lançamento"}
      >
        <div className="space-y-4">
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
          <Field label="Descrição">
            <input
              className={fieldControlClass}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Serviço, sinal, saldo do evento…"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Valor (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={fieldControlClass}
                value={draft.amount}
                onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
              />
            </Field>
            <Field label="Vencimento">
              <input
                type="date"
                className={fieldControlClass}
                value={draft.dueDate}
                onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </Field>
          </div>
          <Field label="Observações">
            <textarea
              className={cn(fieldControlClass, "min-h-20 py-2")}
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </Field>
          {editing ? (
            <label className="flex items-center gap-2 text-sm text-forest/70">
              <input
                type="checkbox"
                className="size-4 accent-forest"
                checked={editing.canceled}
                onChange={() => {
                  toggleCancel(editing);
                  setEditing({ ...editing, canceled: !editing.canceled });
                }}
              />
              Cancelar este lançamento
            </label>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
            <Button type="button" variant="outline" className="h-10" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={saveForm}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(receiptFor)} onClose={() => setReceiptFor(null)} title="Registrar recebimento">
        {receiptFor ? (
          <div className="space-y-4">
            <p className="text-sm font-light text-forest/60">
              {receiptFor.clientName || receiptFor.description} · saldo {formatBRL(remainingAmount(receiptFor))}
            </p>
            {(receiptFor.receipts ?? []).length > 0 ? (
              <ul className="space-y-1 rounded-xl border border-forest/10 bg-white px-3 py-2 text-xs text-forest/60">
                {receiptFor.receipts.map((receipt) => (
                  <li key={receipt.id}>
                    {receipt.date ? formatShortDate(receipt.date) : "—"} · {receivableMethodLabel(receipt.method)} ·{" "}
                    {formatBRL(receipt.amount)}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Valor recebido (R$)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldControlClass}
                  value={receiptAmount}
                  onChange={(event) => setReceiptAmount(event.target.value)}
                />
              </Field>
              <Field label="Data">
                <input
                  type="date"
                  className={fieldControlClass}
                  value={receiptDate}
                  onChange={(event) => setReceiptDate(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Forma">
              <select
                className={fieldControlClass}
                value={receiptMethod}
                onChange={(event) => setReceiptMethod(event.target.value as ReceivableMethod)}
              >
                {RECEIVABLE_METHODS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observação">
              <input
                className={fieldControlClass}
                value={receiptNote}
                onChange={(event) => setReceiptNote(event.target.value)}
                placeholder="Comprovante, parcela…"
              />
            </Field>
            <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
              <Button type="button" variant="outline" className="h-10" onClick={() => setReceiptFor(null)}>
                Fechar
              </Button>
              <Button type="button" className="h-10 bg-terracotta px-5 text-cream hover:bg-terracotta/90" onClick={saveReceipt}>
                Registrar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-forest/10 bg-white px-4 py-3">
      <p className="field-label">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold text-forest", warn && "text-terracotta")}>{value}</p>
    </div>
  );
}
