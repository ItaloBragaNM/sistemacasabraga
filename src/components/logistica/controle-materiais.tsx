"use client";

import { Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { StatusBadge } from "@/components/events/status-badge";
import { fieldControlClass, Field } from "@/components/events/field";
import { useEvents } from "@/components/events/events-provider";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { QtyInput } from "@/components/ui/qty-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { KpiCard, StatusPill } from "@/components/ui/status-pill";
import { MATERIAL_KIND_LABELS } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import { controlLossQty, controlSnapshot, suggestedLossReason } from "@/lib/logistica/event-control";
import {
  MATERIAL_LOSS_REASONS,
  materialLossReasonLabel,
  type EventMaterialControl,
  type EventMaterialControlItem,
  type MaterialLossReason,
} from "@/lib/logistica/types";
import { cn } from "@/lib/utils";

type Tab = "eventos" | "perdas";

export function ControleMateriaisEventos() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady } = useLogistica();
  const [tab, setTab] = useState<Tab>("eventos");
  const [search, setSearch] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const ready = eventsReady && cadReady && logReady;

  const controls = useMemo(
    () => new Map((logistica?.eventControls ?? []).map((item) => [item.eventId, item])),
    [logistica],
  );

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...events]
      .sort((a, b) => compareDateSort(a.date, b.date, dateSort) || a.title.localeCompare(b.title, "pt-BR"))
      .filter((event) => {
        if (event.status === "cancelado") return false;
        if (!term) return true;
        const control = controls.get(event.id);
        return (
          event.title.toLowerCase().includes(term) ||
          event.code.toLowerCase().includes(term) ||
          (control?.status === "conferido" && "conferido".includes(term))
        );
      });
  }, [events, search, controls, dateSort]);

  const losses = useMemo(() => {
    const rows: {
      id: string;
      date: string;
      eventTitle: string;
      eventCode: string;
      material: string;
      qty: number;
      reason: string;
    }[] = [];
    const materialName = new Map((cadastros?.materials ?? []).map((item) => [item.id, item.name]));
    for (const control of logistica?.eventControls ?? []) {
      if (control.status !== "conferido") continue;
      for (const item of control.items) {
        const qty = controlLossQty(item);
        if (qty <= 0) continue;
        rows.push({
          id: `${control.id}-${item.materialId}`,
          date: control.eventDate,
          eventTitle: control.eventTitle,
          eventCode: control.eventCode,
          material: materialName.get(item.materialId) ?? "Material removido",
          qty,
          reason: item.reason ? materialLossReasonLabel(item.reason) : "Sem motivo",
        });
      }
    }
    return rows.sort((a, b) => compareDateSort(a.date, b.date, dateSort));
  }, [cadastros, logistica, dateSort]);

  return (
    <PageShell
      eyebrow="Logística"
      title="Controle de Materiais em Eventos"
      description="Confira o que saiu e o que voltou de cada evento. A diferença vira perda e baixa do estoque."
      actions={
        <SegmentedControl<Tab>
          ariaLabel="Visão"
          value={tab}
          onChange={setTab}
          options={[
            { value: "eventos", label: "Eventos" },
            { value: "perdas", label: "Perdas" },
          ]}
        />
      }
    >
      {!ready ? (
        <LoadingBlock />
      ) : tab === "perdas" ? (
        losses.length === 0 ? (
          <EmptyBlock
            title="Nenhuma perda conferida"
            description="A diferença entre o que saiu e o que voltou aparece aqui depois da conferência."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <DateSortSelect value={dateSort} onChange={setDateSort} />
            </div>
            <Card flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="field-label py-3 pl-4 font-medium">Data</th>
                      <th className="field-label py-3 font-medium">Evento</th>
                      <th className="field-label py-3 font-medium">Material</th>
                      <th className="field-label py-3 font-medium">Motivo</th>
                      <th className="field-label py-3 pr-4 text-right font-medium">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {losses.map((row) => (
                      <tr key={row.id} className="border-b border-line last:border-0">
                        <td className="py-3 pl-4 tabular text-forest/70">{row.date ? formatShortDate(row.date) : "—"}</td>
                        <td className="py-3">
                          <p className="text-forest">{row.eventTitle}</p>
                          <p className="meta-text">{row.eventCode}</p>
                        </td>
                        <td className="py-3 text-forest">{row.material}</td>
                        <td className="py-3">
                          <StatusPill tone="danger">{row.reason}</StatusPill>
                        </td>
                        <td className="py-3 pr-4 text-right font-medium tabular text-danger">{formatInt(row.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] max-w-md flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar evento…" />
            </div>
            <DateSortSelect value={dateSort} onChange={setDateSort} />
          </div>
          {filteredEvents.length === 0 ? (
            <EmptyBlock
              title="Nenhum evento"
              description="A conferência usa a lista da separação de materiais de cada ficha."
            />
          ) : (
            <Card flush>
              {filteredEvents.map((event, index) => {
                const control = controls.get(event.id);
                const loss = (control?.items ?? []).reduce((sum, item) => sum + controlLossQty(item), 0);
                return (
                  <Link
                    key={event.id}
                    href={`/logistica/controle-materiais/${event.id}`}
                    className={cn(
                      "grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-cream sm:grid-cols-[96px_minmax(0,1fr)_auto]",
                      index > 0 && "border-t border-line",
                    )}
                  >
                    <p className="text-sm tabular text-forest/70">{event.date ? formatShortDate(event.date) : "Sem data"}</p>
                    <div className="min-w-0">
                      <p className="truncate text-forest">{event.title || "Evento sem nome"}</p>
                      <p className="meta-text">
                        {event.code}
                        {control?.status === "conferido" && loss > 0 ? ` · ${formatInt(loss)} de perda` : ""}
                      </p>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
                      {control?.status === "conferido" ? (
                        <StatusPill tone="ok">Conferido</StatusPill>
                      ) : control ? (
                        <StatusPill tone="warn">Rascunho</StatusPill>
                      ) : (
                        <StatusPill>A conferir</StatusPill>
                      )}
                      <StatusBadge status={event.status} />
                    </div>
                  </Link>
                );
              })}
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}

export function ControleMateriaisEvento({ eventId }: { eventId: string }) {
  const { ready: eventsReady, getEvent } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady, upsertEventControl, removeEventControl } = useLogistica();
  const event = getEvent(eventId);
  const ready = eventsReady && cadReady && logReady;

  const saved = useMemo(
    () => (logistica?.eventControls ?? []).find((item) => item.eventId === eventId) ?? null,
    [logistica, eventId],
  );

  if (!ready) return <LoadingBlock />;
  if (!event || !cadastros) {
    return (
      <PageShell title="Controle de Materiais">
        <EmptyBlock
          title="Evento não encontrado"
          description="Ele pode ter sido excluído ou o link está incompleto."
          action={
            <Link href="/logistica/controle-materiais" className={cn(buttonVariants({ variant: "outline" }), "px-4")}>
              Voltar para a lista
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <ControleEditor
      key={saved?.id ?? event.id}
      snapshot={controlSnapshot(event, cadastros, saved)}
      saved={saved}
      onSave={upsertEventControl}
      onDelete={removeEventControl}
    />
  );
}

/** Mesmas colunas no cabeçalho e em todas as linhas, em todas as categorias. */
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_80px_80px_56px] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_72px_80px_80px_64px]";

function ControleEditor({
  snapshot,
  saved,
  onSave,
  onDelete,
}: {
  snapshot: EventMaterialControl;
  saved: EventMaterialControl | null;
  onSave: (control: EventMaterialControl) => void;
  onDelete: (id: string) => void;
}) {
  const { data: cadastros } = useCadastros();
  const [items, setItems] = useState<EventMaterialControlItem[]>(snapshot.items);
  const [note, setNote] = useState(snapshot.note);
  const [query, setQuery] = useState("");
  const [onlyLoss, setOnlyLoss] = useState(false);
  const materialById = useMemo(
    () => new Map((cadastros?.materials ?? []).map((item) => [item.id, item])),
    [cadastros],
  );

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = items.filter((item) => {
      const material = materialById.get(item.materialId);
      if (onlyLoss && controlLossQty(item) <= 0) return false;
      if (!term) return true;
      return (
        (material?.name ?? "").toLowerCase().includes(term) ||
        (material?.category ?? "").toLowerCase().includes(term)
      );
    });
    const map = new Map<string, EventMaterialControlItem[]>();
    for (const item of visible) {
      const category = materialById.get(item.materialId)?.category || "Outros";
      const list = map.get(category) ?? [];
      list.push(item);
      map.set(category, list);
    }
    return [...map.entries()];
  }, [items, query, onlyLoss, materialById]);

  const sentTotal = items.reduce((sum, item) => sum + (Number(item.sent) || 0), 0);
  const returnedTotal = items.reduce((sum, item) => sum + (Number(item.returned) || 0), 0);
  const lossTotal = items.reduce((sum, item) => sum + controlLossQty(item), 0);
  const lossCount = items.filter((item) => controlLossQty(item) > 0).length;
  const conferido = saved?.status === "conferido";

  const patch = (materialId: string, next: Partial<EventMaterialControlItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.materialId !== materialId) return item;
        const merged = { ...item, ...next };
        const loss = controlLossQty(merged);
        const kind = materialById.get(materialId)?.kind;
        if (loss > 0 && !merged.reason) merged.reason = suggestedLossReason(kind, loss);
        if (loss <= 0) merged.reason = "";
        return merged;
      }),
    );
  };

  const persist = (status: EventMaterialControl["status"]) => {
    const missingReason = items.some((item) => controlLossQty(item) > 0 && !item.reason);
    if (status === "conferido" && missingReason) {
      toast.error("Informe o motivo de cada perda (saiu − voltou).");
      return;
    }
    const now = new Date().toISOString();
    onSave({
      ...snapshot,
      items,
      note,
      status,
      updatedAt: now,
      concludedAt: status === "conferido" ? now : undefined,
    });
    toast.success(status === "conferido" ? "Conferência lançada no estoque." : "Rascunho salvo.");
  };

  return (
    <PageShell>
      <div className="sticky top-16 z-10 -mx-4 bg-cream/95 px-4 pt-1 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <PageHeader
          back={
            <Link href="/logistica/controle-materiais" className="text-sm text-forest/55 hover:text-forest">
              ← Eventos
            </Link>
          }
          eyebrow={[snapshot.eventCode, snapshot.eventDate ? formatShortDate(snapshot.eventDate) : ""]
            .filter(Boolean)
            .join(" · ")}
          title={snapshot.eventTitle}
          actions={
            <>
              {conferido ? <StatusPill tone="ok">Conferido</StatusPill> : null}
              {saved ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm("Excluir esta conferência? Os movimentos de estoque serão estornados.")) return;
                    onDelete(saved.id);
                    toast.success("Conferência excluída.");
                  }}
                >
                  Excluir
                </Button>
              ) : null}
              {conferido ? (
                <Button variant="outline" onClick={() => persist("rascunho")}>
                  <RotateCcw data-icon="inline-start" />
                  Reabrir
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => persist("rascunho")}>
                    Salvar rascunho
                  </Button>
                  <Button onClick={() => persist("conferido")}>
                    <Check data-icon="inline-start" />
                    Conferir e lançar estoque
                  </Button>
                </>
              )}
            </>
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Saiu" value={formatInt(sentTotal)} />
        <KpiCard label="Voltou" value={formatInt(returnedTotal)} />
        <KpiCard
          label="Perda"
          value={formatInt(lossTotal)}
          hint={lossCount > 0 ? `${lossCount} ${lossCount === 1 ? "item" : "itens"}` : "Nada faltando"}
          tone={lossTotal > 0 ? "danger" : "neutral"}
        />
      </div>

      {items.length === 0 ? (
        <EmptyBlock
          title="Nenhum material na separação"
          description="Vincule materiais aos pratos ou complete a separação deste evento."
        />
      ) : (
        <Card flush>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="min-w-[12rem] flex-1 sm:max-w-xs">
              <SearchInput value={query} onChange={setQuery} placeholder="Buscar material…" />
            </div>
            <FilterChip tone="danger" active={onlyLoss} onClick={() => setOnlyLoss((current) => !current)}>
              Só com perda{lossCount > 0 ? ` · ${lossCount}` : ""}
            </FilterChip>
          </div>

          <div className={cn(ROW_GRID, "border-b border-line px-4 py-2")}>
            <span className="field-label">Material</span>
            <span className="field-label hidden text-right sm:block">Previsto</span>
            <span className="field-label text-right">Saiu</span>
            <span className="field-label text-right">Voltou</span>
            <span className="field-label text-right">Perda</span>
          </div>

          {groups.length === 0 ? (
            <p className="meta-text px-4 py-10 text-center">Nenhum material nesse filtro.</p>
          ) : (
            groups.map(([category, group]) => (
              <Fragment key={category}>
                <div className="flex items-baseline gap-2 border-b border-line bg-forest/[0.025] px-4 py-2">
                  <span className="group-title">{category}</span>
                  <span className="meta-text">{group.length}</span>
                </div>
                {group.map((item) => {
                  const material = materialById.get(item.materialId);
                  const loss = controlLossQty(item);
                  return (
                    <div
                      key={item.materialId}
                      className={cn("border-b border-line last:border-0", loss > 0 && "bg-danger/[0.035]")}
                    >
                      <div className={cn(ROW_GRID, "gap-y-2 px-4 py-2.5")}>
                        <div className="col-span-4 min-w-0 sm:col-span-1">
                          <p className="truncate text-sm font-medium text-forest">
                            {material?.name ?? "Material removido"}
                          </p>
                          <p className="meta-text truncate">
                            {[material ? MATERIAL_KIND_LABELS[material.kind] : "", material?.unit ?? ""]
                              .filter(Boolean)
                              .join(" · ")}
                            <span className="sm:hidden"> · previsto {formatInt(item.planned)}</span>
                          </p>
                        </div>
                        <span className="hidden text-right text-sm tabular text-forest/60 sm:block">
                          {formatInt(item.planned)}
                        </span>
                        <span className="sm:hidden" />
                        <QtyInput
                          ariaLabel={`Saiu · ${material?.name ?? ""}`}
                          value={item.sent}
                          disabled={conferido}
                          onChange={(sent) => patch(item.materialId, { sent })}
                          className="justify-self-end"
                        />
                        <QtyInput
                          ariaLabel={`Voltou · ${material?.name ?? ""}`}
                          value={item.returned}
                          disabled={conferido}
                          onChange={(returned) => patch(item.materialId, { returned })}
                          className="justify-self-end"
                        />
                        <span
                          className={cn(
                            "text-right text-sm tabular",
                            loss > 0 ? "font-semibold text-danger" : "text-forest/30",
                          )}
                        >
                          {loss > 0 ? `−${formatInt(loss)}` : "—"}
                        </span>
                      </div>
                      {loss > 0 ? (
                        <div className="space-y-2 px-4 pb-3">
                          <div className="flex flex-wrap gap-2">
                            {MATERIAL_LOSS_REASONS.map((reason) => (
                              <FilterChip
                                key={reason.key}
                                tone="danger"
                                active={item.reason === reason.key}
                                disabled={conferido}
                                onClick={() => patch(item.materialId, { reason: reason.key as MaterialLossReason })}
                              >
                                {reason.label}
                              </FilterChip>
                            ))}
                          </div>
                          <input
                            className={cn(fieldControlClass, "h-9 max-w-md")}
                            value={item.note}
                            disabled={conferido}
                            onChange={(event) => patch(item.materialId, { note: event.target.value })}
                            placeholder="Observação da perda (opcional)"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </Fragment>
            ))
          )}
        </Card>
      )}

      <Card>
        <Field label="Observação da conferência">
          <textarea
            className={cn(fieldControlClass, "min-h-20 py-2")}
            value={note}
            disabled={conferido}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Algo que vale para a conferência inteira"
          />
        </Field>
      </Card>
    </PageShell>
  );
}
