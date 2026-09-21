"use client";

import { FileDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/crm/format";
import { formatLongDate } from "@/lib/dates";
import { slugify } from "@/lib/download";
import { downloadContaAzulSheet } from "@/lib/mao-de-obra/conta-azul";
import type { LaborPayment, LaborPaymentStatus } from "@/lib/mao-de-obra/types";

const STATUS_LABEL: Record<LaborPaymentStatus, string> = {
  aberto: "Aberto",
  exportado: "Exportado",
  pago: "Pago",
};

export function PagamentoMaoDeObraPage() {
  const { data, ready, setPayments, removePayment } = useMaoDeObra();
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [working, setWorking] = useState(false);

  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);
  const events = useMemo(() => {
    const map = new Map<string, { id: string; code: string; title: string; date: string }>();
    for (const payment of payments) {
      if (!map.has(payment.eventId)) {
        map.set(payment.eventId, {
          id: payment.eventId,
          code: payment.eventCode,
          title: payment.eventTitle,
          date: payment.eventDate,
        });
      }
    }
    return [...map.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [payments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments
      .filter((item) => (eventFilter ? item.eventId === eventFilter : true))
      .filter((item) => {
        if (!term) return true;
        return `${item.workerName} ${item.functionLabel} ${item.eventCode} ${item.eventTitle}`
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || "") || a.workerName.localeCompare(b.workerName, "pt-BR"));
  }, [eventFilter, payments, search]);

  const exportRows = filtered.length ? filtered : payments.filter((item) => !eventFilter || item.eventId === eventFilter);

  const mark = (ids: string[], status: LaborPaymentStatus) => {
    setPayments(payments.map((item) => (ids.includes(item.id) ? { ...item, status, updatedAt: new Date().toISOString() } : item)));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Administrativo"
        title="Pagamento de mão de obra"
        action={
          <Button
            className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
            disabled={working || exportRows.length === 0}
            onClick={async () => {
              try {
                setWorking(true);
                const fileName = eventFilter
                  ? `conta-azul-mao-de-obra-${slugify(exportRows[0]?.eventCode || "evento")}`
                  : "conta-azul-mao-de-obra";
                await downloadContaAzulSheet(exportRows, fileName);
                mark(
                  exportRows.filter((item) => item.status === "aberto").map((item) => item.id),
                  "exportado",
                );
                toast.success("Planilha pronta para importar no Conta Azul.");
              } catch (error) {
                console.error(error);
                toast.error("Não foi possível gerar a planilha.");
              } finally {
                setWorking(false);
              }
            }}
          >
            <FileDown data-icon="inline-start" />
            Baixar planilha Conta Azul
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : payments.length === 0 ? (
        <EmptyBlock
          title="Nenhum pagamento gerado"
          description="Alocar prestadores na ficha do evento cria automaticamente os lançamentos nesta tela."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por pessoa, função ou evento…" />
            </div>
            <select
              className="h-10 rounded-md border border-forest/15 bg-white px-3 text-sm text-forest"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="">Todos os eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.code} · {event.title}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10">
                  <th className="field-label py-3 pl-5 font-normal">Pessoa</th>
                  <th className="field-label py-3 font-normal">Evento</th>
                  <th className="field-label py-3 font-normal">Composição</th>
                  <th className="field-label py-3 font-normal">Total</th>
                  <th className="field-label py-3 pr-5 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <PaymentRow
                    key={item.id}
                    item={item}
                    onStatus={(status) => mark([item.id], status)}
                    onRemove={() => {
                      if (!window.confirm(`Excluir o lançamento de ${item.workerName}?`)) return;
                      removePayment(item.id);
                      toast.success("Lançamento excluído.");
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PaymentRow({
  item,
  onStatus,
  onRemove,
}: {
  item: LaborPayment;
  onStatus: (status: LaborPaymentStatus) => void;
  onRemove: () => void;
}) {
  const parts = [
    `diária ${formatBRL(item.daily)}`,
    item.overtimeHours ? `${item.overtimeHours}h extra ${formatBRL(item.overtimeAmount)}` : "",
    item.allowance ? `ajuda ${formatBRL(item.allowance)}` : "",
  ].filter(Boolean);

  return (
    <tr className="border-b border-forest/5 last:border-0">
      <td className="py-3 pl-5">
        <p className="font-medium text-forest">{item.workerName}</p>
        <p className="text-xs font-light text-forest/45">
          {item.functionLabel}
          {item.workerCpf ? ` · ${item.workerCpf}` : ""}
        </p>
      </td>
      <td className="py-3">
        <p className="text-forest">{item.eventTitle || item.eventCode}</p>
        <p className="text-xs font-light text-forest/45">
          {item.eventCode}
          {item.eventDate ? ` · ${formatLongDate(item.eventDate)}` : ""}
        </p>
      </td>
      <td className="py-3 text-xs font-light text-forest/60">{parts.join(" · ")}</td>
      <td className="py-3 font-medium text-forest">{formatBRL(item.total)}</td>
      <td className="py-3 pr-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            className={
              item.status === "pago"
                ? "bg-forest/10 text-forest"
                : item.status === "exportado"
                  ? "bg-petrol/10 text-petrol"
                  : "bg-terracotta/10 text-terracotta"
            }
          >
            {STATUS_LABEL[item.status]}
          </Chip>
          <select
            className="h-8 rounded-md border border-forest/15 bg-white px-2 text-xs text-forest"
            value={item.status}
            onChange={(event) => onStatus(event.target.value as LaborPaymentStatus)}
          >
            <option value="aberto">Aberto</option>
            <option value="exportado">Exportado</option>
            <option value="pago">Pago</option>
          </select>
          <button
            type="button"
            aria-label={`Excluir ${item.workerName}`}
            className="flex size-8 items-center justify-center rounded-lg text-forest/40 hover:bg-terracotta/10 hover:text-terracotta"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
