"use client";

import { Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { StatusBadge } from "@/components/events/status-badge";
import { fieldControlClass, Field } from "@/components/events/field";
import { useEvents } from "@/components/events/events-provider";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { MATERIAL_KIND_LABELS } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import {
  controlLossQty,
  controlSnapshot,
  suggestedLossReason,
} from "@/lib/logistica/event-control";
import {
  MATERIAL_LOSS_REASONS,
  materialLossReasonLabel,
  type EventMaterialControl,
  type EventMaterialControlItem,
  type MaterialLossReason,
} from "@/lib/logistica/types";
import { cn } from "@/lib/utils";

export function ControleMateriaisEventos() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady } = useLogistica();
  const [tab, setTab] = useState<"eventos" | "perdas">("eventos");
  const [search, setSearch] = useState("");
  const ready = eventsReady && cadReady && logReady;

  const controls = useMemo(
    () => new Map((logistica?.eventControls ?? []).map((item) => [item.eventId, item])),
    [logistica],
  );

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...events]
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title, "pt-BR"))
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
  }, [events, search, controls]);

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
    return rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [cadastros, logistica]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Logística"
        title="Controle de materiais em eventos"
        action={
          <div className="flex rounded-lg border border-forest/15 p-1">
            <button
              type="button"
              className={cn(
                "h-8 rounded-md px-3 text-sm",
                tab === "eventos" ? "bg-forest text-cream" : "text-forest/70",
              )}
              onClick={() => setTab("eventos")}
            >
              Eventos
            </button>
            <button
              type="button"
              className={cn(
                "h-8 rounded-md px-3 text-sm",
                tab === "perdas" ? "bg-forest text-cream" : "text-forest/70",
              )}
              onClick={() => setTab("perdas")}
            >
              Perdas
            </button>
          </div>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : tab === "perdas" ? (
        losses.length === 0 ? (
          <EmptyBlock
            title="Nenhuma perda conferida"
            description="A diferença entre o que saiu e o que voltou aparece aqui depois da conferência."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10">
                  <th className="field-label py-3 pl-5 font-normal">Data</th>
                  <th className="field-label py-3 font-normal">Evento</th>
                  <th className="field-label py-3 font-normal">Material</th>
                  <th className="field-label py-3 font-normal">Motivo</th>
                  <th className="field-label py-3 pr-5 text-right font-normal">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {losses.map((row) => (
                  <tr key={row.id} className="border-b border-forest/5 last:border-0">
                    <td className="py-3 pl-5 text-forest/60">
                      {row.date ? formatShortDate(row.date) : "—"}
                    </td>
                    <td className="py-3">
                      <p className="text-forest">{row.eventTitle}</p>
                      <p className="text-xs font-light text-forest/45">{row.eventCode}</p>
                    </td>
                    <td className="py-3 text-forest">{row.material}</td>
                    <td className="py-3">
                      <Chip className="bg-terracotta/10 text-terracotta">{row.reason}</Chip>
                    </td>
                    <td className="py-3 pr-5 text-right tabular-nums text-terracotta">
                      {formatInt(row.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <input
            className={cn(fieldControlClass, "max-w-md")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar evento…"
          />
          {filteredEvents.length === 0 ? (
            <EmptyBlock
              title="Nenhum evento"
              description="A conferência usa a lista da separação de materiais de cada ficha."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              {filteredEvents.map((event, index) => {
                const control = controls.get(event.id);
                const loss = (control?.items ?? []).reduce((sum, item) => sum + controlLossQty(item), 0);
                return (
                  <Link
                    key={event.id}
                    href={`/logistica/controle-materiais/${event.id}`}
                    className={cn(
                      "grid gap-2 px-5 py-3 transition-colors hover:bg-cream md:grid-cols-[110px_1fr_auto] md:items-center",
                      index > 0 && "border-t border-forest/8",
                    )}
                  >
                    <p className="text-sm text-forest/60">
                      {event.date ? formatShortDate(event.date) : "Sem data"}
                    </p>
                    <div>
                      <p className="text-forest">{event.title || "Evento sem nome"}</p>
                      <p className="mt-0.5 text-xs font-light text-forest/50">
                        {event.code}
                        {control?.status === "conferido" && loss > 0 ? ` · ${formatInt(loss)} de perda` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 md:items-end">
                      {control?.status === "conferido" ? (
                        <Chip className="bg-forest/8 text-forest">Conferido</Chip>
                      ) : control ? (
                        <Chip className="bg-forest/6 text-forest/60">Rascunho</Chip>
                      ) : (
                        <Chip className="bg-forest/[0.04] text-forest/45">A conferir</Chip>
                      )}
                      <StatusBadge status={event.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
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
      <div className="mx-auto max-w-5xl py-20 text-center">
        <h1 className="page-title">Evento não encontrado</h1>
        <Link
          href="/logistica/controle-materiais"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 px-4")}
        >
          Voltar
        </Link>
      </div>
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
  const materialById = useMemo(
    () => new Map((cadastros?.materials ?? []).map((item) => [item.id, item])),
    [cadastros],
  );

  const sentTotal = items.reduce((sum, item) => sum + (Number(item.sent) || 0), 0);
  const returnedTotal = items.reduce((sum, item) => sum + (Number(item.returned) || 0), 0);
  const lossTotal = items.reduce((sum, item) => sum + controlLossQty(item), 0);
  const conferido = saved?.status === "conferido";

  const patch = (materialId: string, next: Partial<EventMaterialControlItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.materialId !== materialId) return item;
        const merged = { ...item, ...next };
        const loss = controlLossQty(merged);
        const kind = materialById.get(materialId)?.kind;
        if (loss > 0 && !merged.reason) {
          merged.reason = suggestedLossReason(kind, loss);
        }
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
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-col gap-4 border-b border-forest/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/logistica/controle-materiais"
            className="text-sm font-light text-forest/55 hover:text-forest"
          >
            ← Eventos
          </Link>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-forest/45">
            Logística · controle
          </p>
          <h1 className="page-title mt-1">{snapshot.eventTitle}</h1>
          <p className="mt-1 text-sm font-light text-forest/55">
            {snapshot.eventCode}
            {snapshot.eventDate ? ` · ${formatShortDate(snapshot.eventDate)}` : ""}
            {conferido ? " · conferido" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {saved ? (
            <Button
              variant="outline"
              className="h-10 text-terracotta hover:text-terracotta"
              onClick={() => {
                if (!window.confirm("Excluir esta conferência? Os movimentos de estoque serão estornados.")) {
                  return;
                }
                onDelete(saved.id);
                toast.success("Conferência excluída.");
              }}
            >
              Excluir
            </Button>
          ) : null}
          {conferido ? (
            <Button variant="outline" className="h-10" onClick={() => persist("rascunho")}>
              <RotateCcw data-icon="inline-start" />
              Reabrir
            </Button>
          ) : (
            <>
              <Button variant="outline" className="h-10" onClick={() => persist("rascunho")}>
                Salvar rascunho
              </Button>
              <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={() => persist("conferido")}>
                <Check data-icon="inline-start" />
                Conferir e lançar estoque
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Saiu" value={formatInt(sentTotal)} />
        <Summary label="Voltou" value={formatInt(returnedTotal)} />
        <Summary label="Perda" value={formatInt(lossTotal)} warn={lossTotal > 0} />
      </div>

      {items.length === 0 ? (
        <EmptyBlock
          title="Nenhum material na separação"
          description="Vincule materiais aos pratos ou complete a separação deste evento."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-forest/10 bg-white">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-3 pl-5 font-normal">Material</th>
                <th className="field-label py-3 text-right font-normal">Previsto</th>
                <th className="field-label py-3 text-right font-normal">Saiu</th>
                <th className="field-label py-3 text-right font-normal">Voltou</th>
                <th className="field-label py-3 text-right font-normal">Perda</th>
                <th className="field-label py-3 font-normal">Motivo</th>
                <th className="field-label py-3 pr-5 font-normal">Obs</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const material = materialById.get(item.materialId);
                const loss = controlLossQty(item);
                return (
                  <tr key={item.materialId} className="border-b border-forest/5 last:border-0">
                    <td className="py-2.5 pl-5">
                      <p className="text-forest">{material?.name ?? "Material removido"}</p>
                      <p className="text-xs font-light text-forest/45">
                        {material ? MATERIAL_KIND_LABELS[material.kind] : ""}
                        {material?.unit ? ` · ${material.unit}` : ""}
                      </p>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-forest/55">
                      {formatInt(item.planned)}
                    </td>
                    <td className="py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        className={cn(fieldControlClass, "ml-auto h-9 w-20 text-right")}
                        value={item.sent}
                        disabled={conferido}
                        onChange={(event) => patch(item.materialId, { sent: Number(event.target.value) })}
                      />
                    </td>
                    <td className="py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        className={cn(fieldControlClass, "ml-auto h-9 w-20 text-right")}
                        value={item.returned}
                        disabled={conferido}
                        onChange={(event) =>
                          patch(item.materialId, { returned: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-right tabular-nums",
                        loss > 0 ? "font-medium text-terracotta" : "text-forest/40",
                      )}
                    >
                      {formatInt(loss)}
                    </td>
                    <td className="py-2.5">
                      <select
                        className={cn(fieldControlClass, "h-9 min-w-[9rem]")}
                        value={item.reason}
                        disabled={conferido || loss <= 0}
                        onChange={(event) =>
                          patch(item.materialId, {
                            reason: event.target.value as MaterialLossReason | "",
                          })
                        }
                      >
                        <option value="">{loss > 0 ? "Motivo…" : "—"}</option>
                        {MATERIAL_LOSS_REASONS.map((reason) => (
                          <option key={reason.key} value={reason.key}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-5">
                      <input
                        className={cn(fieldControlClass, "h-9")}
                        value={item.note}
                        disabled={conferido}
                        onChange={(event) => patch(item.materialId, { note: event.target.value })}
                        placeholder="Opcional"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Field label="Observação da conferência">
        <textarea
          className={cn(fieldControlClass, "min-h-[5rem]")}
          value={note}
          disabled={conferido}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </div>
  );
}

function Summary({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-forest/10 bg-white px-5 py-4">
      <p className="field-label">{label}</p>
      <p className={cn("mt-1 text-2xl tabular-nums", warn ? "text-terracotta" : "text-forest")}>{value}</p>
    </div>
  );
}
