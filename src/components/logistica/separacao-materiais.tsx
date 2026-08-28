"use client";

import { AlertTriangle, ClipboardList, FileDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { useEvents } from "@/components/events/events-provider";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass } from "@/components/events/field";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  computeSeparationItems,
  eventCalcContext,
  separationWarnings,
} from "@/lib/cadastros/calc";
import type { CadastrosData } from "@/lib/cadastros/types";
import { balanceOf, computeBalances } from "@/lib/logistica/calc";
import type { StockMovement } from "@/lib/logistica/types";
import { PackageMinus } from "lucide-react";
import { formatShortDate } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import {
  guestTotal,
  type EventRecord,
  type MaterialSeparationExtra,
  type MaterialSeparationOverride,
  type MaterialSeparationState,
} from "@/lib/types";
import { downloadSeparationPdf, type SeparationPdfRow } from "@/components/logistica/separacao-pdf";
import { cn } from "@/lib/utils";

const EMPTY_SEP: MaterialSeparationState = { overrides: {}, extras: [] };

interface Row {
  key: string;
  materialId?: string;
  extraId?: string;
  name: string;
  category: string;
  unit: string;
  computedQty: number;
  finalQty: number;
  note: string;
  edited: boolean;
  isExtra: boolean;
}

export function SeparacaoMateriais() {
  const { events, ready: eventsReady, getEvent, upsert } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState("");

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [events],
  );

  const paramId = searchParams.get("evento") ?? "";
  const effectiveId = selectedId || paramId || sortedEvents[0]?.id || "";
  const event = effectiveId ? getEvent(effectiveId) : null;

  const ready = eventsReady && cadastrosReady;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-col gap-4 border-b border-forest/10 pb-6">
        <div>
          <p className="font-section text-[0.68rem] text-terracotta">Logística</p>
          <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">
            Separação de Materiais
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-light text-forest/60">
            A lista é calculada a partir dos pratos do evento e da proporção de cada material.
            Ajuste item a item, anote observações e gere o PDF operacional.
          </p>
        </div>
      </header>

      {!ready ? (
        <p className="py-16 text-center text-sm font-light text-forest/50">Carregando…</p>
      ) : sortedEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-forest/20 bg-white/60 p-10 text-center">
          <h2 className="font-display text-2xl text-forest">Nenhum evento</h2>
          <p className="mt-2 text-sm font-light text-forest/55">
            Crie uma ficha de evento para separar materiais.
          </p>
          <Link
            href="/eventos/novo"
            className={cn(buttonVariants(), "mt-5 h-10 bg-forest px-5 text-cream hover:bg-petrol")}
          >
            Nova ficha
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-forest/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-1 items-center gap-3">
              <span className="field-label shrink-0">Evento</span>
              <select
                className={fieldControlClass}
                value={effectiveId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {sortedEvents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code ? `${item.code} · ` : ""}
                    {item.title || "Evento sem nome"}
                    {item.date ? ` (${formatShortDate(item.date)})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {event ? (
              <Link
                href={`/eventos/${event.id}`}
                className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
              >
                Abrir ficha
              </Link>
            ) : null}
          </div>

          {event && cadastros ? (
            <SeparationEditor
              key={event.id}
              event={event}
              cadastros={cadastros}
              onSave={upsert}
            />
          ) : (
            <p className="py-10 text-center text-sm font-light text-forest/50">
              Selecione um evento para ver a lista.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SeparationEditor({
  event,
  cadastros,
  onSave,
}: {
  event: EventRecord;
  cadastros: CadastrosData;
  onSave: (event: EventRecord) => void;
}) {
  const { data: logistica, addMovements } = useLogistica();
  const [sep, setSep] = useState<MaterialSeparationState>(
    () => event.materialSeparation ?? EMPTY_SEP,
  );

  const balances = useMemo(
    () => computeBalances(logistica?.movements ?? []),
    [logistica],
  );

  const applySep = useCallback(
    (next: MaterialSeparationState) => {
      setSep(next);
      onSave({ ...event, materialSeparation: { ...next, updatedAt: new Date().toISOString() } });
    },
    [event, onSave],
  );

  const ctx = useMemo(() => eventCalcContext(event), [event]);
  const computed = useMemo(
    () => computeSeparationItems(cadastros, ctx),
    [cadastros, ctx],
  );
  const warnings = useMemo(() => separationWarnings(ctx), [ctx]);

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    for (const item of computed) {
      const override = sep.overrides[item.materialId];
      if (override?.removed) continue;
      const finalQty = override?.quantity ?? item.computedQty;
      const note = override?.note ?? "";
      list.push({
        key: item.materialId,
        materialId: item.materialId,
        name: item.name,
        category: item.category,
        unit: item.unit,
        computedQty: item.computedQty,
        finalQty,
        note,
        edited: (override?.quantity != null && override.quantity !== item.computedQty) || !!note,
        isExtra: false,
      });
    }
    for (const extra of sep.extras) {
      list.push({
        key: extra.id,
        extraId: extra.id,
        name: extra.name,
        category: extra.category || "Outros",
        unit: extra.unit,
        computedQty: 0,
        finalQty: extra.quantity,
        note: extra.note ?? "",
        edited: true,
        isExtra: true,
      });
    }
    return list;
  }, [computed, sep]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of rows) {
      const arr = map.get(row.category) ?? [];
      arr.push(row);
      map.set(row.category, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [rows]);

  const removedCount = useMemo(
    () => Object.values(sep.overrides).filter((o) => o.removed).length,
    [sep],
  );
  const totalPieces = rows.reduce((sum, row) => sum + row.finalQty, 0);
  const editedCount = rows.filter((row) => row.edited).length;
  const faltaTotal = rows.reduce((sum, row) => {
    const emEstoque = row.materialId ? Math.max(0, balanceOf(balances, row.materialId)) : 0;
    return sum + Math.max(0, row.finalQty - emEstoque);
  }, 0);

  const giveBaixa = () => {
    const already = (logistica?.movements ?? []).some(
      (m) => m.ref === event.id && m.type === "saida",
    );
    if (
      already &&
      !window.confirm("Este evento já teve baixa no estoque. Registrar baixa novamente?")
    ) {
      return;
    }
    const movements: StockMovement[] = rows
      .filter((row) => !row.isExtra && row.materialId && row.finalQty > 0)
      .map((row) => ({
        id: uid(),
        materialId: row.materialId!,
        type: "saida",
        quantity: -Math.abs(row.finalQty),
        date: new Date().toISOString(),
        note: `Baixa · ${event.code || event.title || "evento"}`,
        ref: event.id,
      }));
    if (!movements.length) {
      toast.error("Nada para dar baixa no estoque.");
      return;
    }
    addMovements(movements);
    toast.success(`Baixa registrada no estoque: ${movements.length} materiais.`);
  };

  const setOverride = (
    materialId: string,
    patch: MaterialSeparationOverride,
    computedQty: number,
  ) => {
    const next = { ...(sep.overrides[materialId] ?? {}), ...patch };
    const cleaned =
      (next.quantity == null || next.quantity === computedQty) && !next.note && !next.removed;
    const overrides = { ...sep.overrides };
    if (cleaned) delete overrides[materialId];
    else overrides[materialId] = next;
    applySep({ ...sep, overrides });
  };

  const updateExtra = (id: string, patch: Partial<MaterialSeparationExtra>) => {
    applySep({
      ...sep,
      extras: sep.extras.map((extra) => (extra.id === id ? { ...extra, ...patch } : extra)),
    });
  };

  const restoreRemoved = () => {
    const overrides: Record<string, MaterialSeparationOverride> = {};
    for (const [id, override] of Object.entries(sep.overrides)) {
      if (override.removed) {
        const rest: MaterialSeparationOverride = { quantity: override.quantity, note: override.note };
        if (rest.quantity != null || rest.note) overrides[id] = rest;
      } else {
        overrides[id] = override;
      }
    }
    applySep({ ...sep, overrides });
  };

  const addExtra = () => {
    applySep({
      ...sep,
      extras: [...sep.extras, { id: uid(), name: "", category: "Outros", unit: "un", quantity: 1 }],
    });
  };

  const generatePdf = async () => {
    const pdfRows: SeparationPdfRow[] = rows
      .slice()
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
      )
      .map((row) => ({
        name: row.name,
        category: row.category,
        unit: row.unit,
        quantity: row.finalQty,
        note: row.note,
        edited: row.edited,
      }));
    try {
      await downloadSeparationPdf(event, pdfRows);
      toast.success("PDF de separação baixado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div className="space-y-5">
      <EventSummary event={event} />

      {warnings.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-terracotta/25 bg-terracotta/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-terracotta" />
          <div className="text-sm text-terracotta">
            <p className="font-medium">Complete a ficha para uma separação precisa:</p>
            <p className="mt-1 font-light">{warnings.map((w) => w.label).join(" · ")}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-forest/70">
          <Stat label="Itens" value={String(rows.length)} />
          <Stat label="Peças" value={String(totalPieces)} />
          <Stat label="Editados" value={String(editedCount)} />
          <Stat label="Falta comprar" value={String(faltaTotal)} />
          {removedCount > 0 ? (
            <button
              type="button"
              onClick={restoreRemoved}
              className="text-terracotta underline-offset-2 hover:underline"
            >
              Restaurar {removedCount} removido(s)
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-4" onClick={addExtra}>
            <Plus data-icon="inline-start" />
            Item avulso
          </Button>
          <Button
            variant="outline"
            className="h-9 px-4"
            onClick={() => {
              if (window.confirm("Descartar todos os ajustes e voltar ao cálculo automático?")) {
                applySep(EMPTY_SEP);
                toast.success("Cálculo restaurado.");
              }
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Restaurar cálculo
          </Button>
          <Button
            variant="outline"
            className="h-9 px-4"
            onClick={giveBaixa}
            disabled={rows.length === 0}
          >
            <PackageMinus data-icon="inline-start" />
            Dar baixa no estoque
          </Button>
          <Button
            className="h-9 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
            onClick={generatePdf}
            disabled={rows.length === 0}
          >
            <FileDown data-icon="inline-start" />
            Gerar PDF
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-forest/20 bg-white/60 p-10 text-center">
          <ClipboardList className="mx-auto mb-3 size-7 text-forest/30" />
          <h3 className="font-display text-2xl text-forest">Lista vazia</h3>
          <p className="mt-2 text-sm font-light text-forest/55">
            Selecione pratos do catálogo na ficha do evento para gerar a lista de materiais.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, items]) => (
            <div key={category} className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <div className="border-b border-forest/10 bg-forest/[0.02] px-4 py-2.5">
                <h2 className="font-section text-[0.72rem] text-forest/75">{category}</h2>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/8">
                    <th className="field-label px-4 py-2 font-normal">Material</th>
                    <th className="field-label w-20 px-2 py-2 text-right font-normal">Calc.</th>
                    <th className="field-label w-24 px-2 py-2 text-right font-normal">Estoque</th>
                    <th className="field-label w-28 px-2 py-2 font-normal">Qtd final</th>
                    <th className="field-label w-20 px-2 py-2 text-right font-normal">Falta</th>
                    <th className="field-label px-2 py-2 font-normal">Observação</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.key}
                      className={cn(
                        "border-b border-forest/5 last:border-0",
                        row.edited && "bg-[#FEF6D9]",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        {row.isExtra ? (
                          <input
                            className={cn(fieldControlClass, "h-9")}
                            placeholder="Material avulso"
                            value={row.name}
                            onChange={(e) => updateExtra(row.extraId!, { name: e.target.value })}
                          />
                        ) : (
                          <span className="font-list font-medium text-forest">
                            {row.name}
                            {row.edited ? (
                              <span className="ml-2 rounded-full bg-[#B8860B]/15 px-2 py-0.5 text-[0.58rem] uppercase tracking-wide text-[#8a6d0b]">
                                editado
                              </span>
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right text-forest/45">
                        {row.isExtra ? "—" : row.computedQty}
                      </td>
                      <td className="px-2 py-2.5 text-right text-forest/60">
                        {row.isExtra || !row.materialId
                          ? "—"
                          : balanceOf(balances, row.materialId)}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            className={cn(fieldControlClass, "h-9 w-20")}
                            value={row.finalQty}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (row.isExtra) updateExtra(row.extraId!, { quantity: value });
                              else setOverride(row.materialId!, { quantity: value }, row.computedQty);
                            }}
                          />
                          <span className="text-xs text-forest/45">{row.unit}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {(() => {
                          const est = row.materialId
                            ? Math.max(0, balanceOf(balances, row.materialId))
                            : 0;
                          const falta = Math.max(0, row.finalQty - est);
                          return (
                            <span
                              className={cn(
                                "font-medium",
                                falta > 0 ? "text-terracotta" : "text-forest/40",
                              )}
                            >
                              {falta > 0 ? falta : "—"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2.5">
                        <input
                          className={cn(fieldControlClass, "h-9")}
                          placeholder="—"
                          value={row.note}
                          onChange={(e) => {
                            if (row.isExtra) updateExtra(row.extraId!, { note: e.target.value });
                            else setOverride(row.materialId!, { note: e.target.value }, row.computedQty);
                          }}
                        />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          aria-label="Remover"
                          onClick={() => {
                            if (row.isExtra) {
                              applySep({
                                ...sep,
                                extras: sep.extras.filter((x) => x.id !== row.extraId),
                              });
                            } else {
                              applySep({
                                ...sep,
                                overrides: {
                                  ...sep.overrides,
                                  [row.materialId!]: {
                                    ...sep.overrides[row.materialId!],
                                    removed: true,
                                  },
                                },
                              });
                            }
                          }}
                          className="flex size-8 items-center justify-center rounded-lg text-forest/35 transition-colors hover:bg-terracotta/10 hover:text-terracotta"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-display text-xl text-forest">{value}</span>
      <span className="field-label">{label}</span>
    </span>
  );
}

function EventSummary({ event }: { event: EventRecord }) {
  const items = [
    { label: "Convidados", value: guestTotal(event.guests) },
    { label: "Ilhas", value: event.islands ?? 0 },
    { label: "Garçons", value: event.staff.garcons },
    { label: "Garçonetes", value: event.staff.garconetes },
    { label: "Copeiras", value: event.staff.copeiros },
    { label: "Chefes", value: event.staff.chefes },
    { label: "Pratos", value: (event.selectedDishIds ?? []).length },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-forest/10 bg-white p-4 sm:grid-cols-7">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p className="font-display text-2xl text-forest">{item.value}</p>
          <p className="field-label mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
