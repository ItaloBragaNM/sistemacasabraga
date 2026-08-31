"use client";

import {
  AlertTriangle,
  Bolt,
  ChevronDown,
  ClipboardList,
  FileDown,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CatalogFilters, Chip } from "@/components/cadastros/ui";
import { EventDrinksFields, EventUniformsFields } from "@/components/events/drinks-uniforms";
import { useEvents } from "@/components/events/events-provider";
import { StatusBadge } from "@/components/events/status-badge";
import { fieldControlClass } from "@/components/events/field";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  computeSeparationItems,
  eventCalcContext,
  separationWarnings,
  type QuantityExplanation,
} from "@/lib/cadastros/calc";
import { kitItemComputedTotal, kitItemTotal, kitQuantity, kitScaleLabel } from "@/lib/cadastros/kits";
import type { CadastrosData, MaterialKit } from "@/lib/cadastros/types";
import { formatShortDate } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import {
  guestTotal,
  normalizeMaterialSeparation,
  suggestedDrinkQuantities,
  type DrinkKey,
  type EventRecord,
  type MaterialSeparationOverride,
  type MaterialSeparationState,
  type UniformPieceKey,
  type UniformSize,
} from "@/lib/types";
import {
  downloadSeparationPdf,
  type SeparationPdfExtra,
  type SeparationPdfKit,
  type SeparationPdfRow,
} from "@/components/logistica/separacao-pdf";
import { cn } from "@/lib/utils";

interface Row {
  key: string;
  materialId?: string;
  name: string;
  category: string;
  unit: string;
  computedQty: number;
  finalQty: number;
  note: string;
  edited: boolean;
  manual?: boolean;
  explanation?: QuantityExplanation;
}

export function SeparacaoMateriais() {
  const { events, ready } = useEvents();
  const { data: cadastros } = useCadastros();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const paramId = searchParams.get("evento") ?? "";
  useEffect(() => {
    if (paramId) router.replace(`/logistica/separacao-materiais/${paramId}`);
  }, [paramId, router]);

  const clientNames = useMemo(
    () => new Map((cadastros?.clientes ?? []).map((cliente) => [cliente.id, cliente.name])),
    [cadastros],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...events]
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title, "pt-BR"))
      .filter((event) => {
        if (statusFilter && event.status !== statusFilter) return false;
        if (typeFilter && event.type !== typeFilter) return false;
        if (!term) return true;
        const client = event.clientId ? clientNames.get(event.clientId) ?? "" : "";
        return (
          event.title.toLowerCase().includes(term) ||
          event.code.toLowerCase().includes(term) ||
          EVENT_TYPE_LABELS[event.type].toLowerCase().includes(term) ||
          event.venue.name.toLowerCase().includes(term) ||
          event.venue.address.toLowerCase().includes(term) ||
          client.toLowerCase().includes(term)
        );
      });
  }, [events, search, statusFilter, typeFilter, clientNames]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="border-b border-forest/10 pb-6">
        <p className="font-section text-[0.68rem] text-terracotta">Logística</p>
        <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">
          Separação de Materiais
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-light text-forest/60">
          Escolha o evento para ver a lista calculada a partir dos pratos, kits, extras e da
          proporção de cada material.
        </p>
      </header>

      {!ready ? (
        <p className="py-16 text-center text-sm font-light text-forest/50">Carregando…</p>
      ) : events.length === 0 ? (
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
          <CatalogFilters
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por nome, código, cliente ou local…"
            facets={[
              {
                id: "status",
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
              {
                id: "type",
                label: "Tipo",
                value: typeFilter,
                onChange: setTypeFilter,
                options: Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
            ]}
          />
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-forest/20 bg-white/60 p-10 text-center">
              <h2 className="font-display text-2xl text-forest">Nenhum evento encontrado</h2>
              <p className="mt-2 text-sm font-light text-forest/55">
                Ajuste a busca ou os filtros para localizar a ficha.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              {filtered.map((event, index) => {
                const client = event.clientId ? clientNames.get(event.clientId) : "";
                return (
                  <Link
                    key={event.id}
                    href={`/logistica/separacao-materiais/${event.id}`}
                    className={cn(
                      "grid gap-3 px-5 py-4 transition-colors hover:bg-cream md:grid-cols-[110px_1fr_auto] md:items-center",
                      index > 0 && "border-t border-forest/8",
                    )}
                  >
                    <p className="font-list text-sm text-forest/60">
                      {event.date ? formatShortDate(event.date) : "Sem data"}
                    </p>
                    <div>
                      <p className="font-display text-2xl text-forest">
                        {event.title || "Evento sem nome"}
                      </p>
                      <p className="font-list mt-1 text-sm text-forest/55">
                        {event.code} · {EVENT_TYPE_LABELS[event.type]}
                        {client ? ` · ${client}` : ""} · {event.venue.name || "Local a definir"} ·{" "}
                        {guestTotal(event.guests)} pax
                      </p>
                    </div>
                    <StatusBadge status={event.status} />
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

export function SeparacaoMateriaisEvent({ eventId }: { eventId: string }) {
  const { ready: eventsReady, getEvent, upsert } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const event = getEvent(eventId);
  const ready = eventsReady && cadastrosReady;

  if (!ready) {
    return (
      <p className="py-16 text-center text-sm font-light text-forest/50">Carregando…</p>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center">
        <h1 className="font-display text-4xl text-forest">Evento não encontrado</h1>
        <p className="mt-2 text-sm font-light text-forest/55">
          Esta ficha pode ter sido excluída neste aparelho.
        </p>
        <Link
          href="/logistica/separacao-materiais"
          className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 px-4")}
        >
          Voltar à lista
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <header className="flex flex-col gap-4 border-b border-forest/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/logistica/separacao-materiais"
            className="text-sm font-light text-forest/55 hover:text-forest"
          >
            ← Eventos
          </Link>
          <p className="font-section mt-3 text-[0.68rem] text-terracotta">Logística</p>
          <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">
            Separação de Materiais
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-light text-forest/60">
            {event.code ? `${event.code} · ` : ""}
            {event.title || "Evento sem nome"}
            {event.date ? ` · ${formatShortDate(event.date)}` : ""}
          </p>
        </div>
        <Link
          href={`/eventos/${event.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          Abrir ficha
        </Link>
      </header>

      {cadastros ? (
        <SeparationEditor key={event.id} event={event} cadastros={cadastros} onSave={upsert} />
      ) : (
        <p className="py-10 text-center text-sm font-light text-forest/50">
          Não foi possível carregar os cadastros.
        </p>
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
  const [sep, setSep] = useState<MaterialSeparationState>(() =>
    normalizeMaterialSeparation(event.materialSeparation),
  );
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [pickMaterialId, setPickMaterialId] = useState("");

  const persistEvent = useCallback(
    (patch: Partial<EventRecord>) => {
      onSave({
        ...event,
        ...patch,
        materialSeparation: patch.materialSeparation
          ? { ...patch.materialSeparation, updatedAt: new Date().toISOString() }
          : sep,
      });
    },
    [event, onSave, sep],
  );

  const applySep = useCallback(
    (next: MaterialSeparationState) => {
      setSep(next);
      persistEvent({ materialSeparation: next });
    },
    [persistEvent],
  );

  const ctx = useMemo(() => eventCalcContext(event, cadastros), [event, cadastros]);
  const computed = useMemo(
    () => computeSeparationItems(cadastros, ctx, sep.addedMaterialIds ?? []),
    [cadastros, ctx, sep.addedMaterialIds],
  );
  const warnings = useMemo(() => separationWarnings(ctx), [ctx]);
  const kits = cadastros.kits ?? [];
  const extraCatalog = cadastros.extras ?? [];
  const materialById = useMemo(
    () => new Map(cadastros.materials.map((item) => [item.id, item])),
    [cadastros.materials],
  );

  const drinks =
    event.drinksAuto === false
      ? event.drinks
      : suggestedDrinkQuantities(guestTotal(event.guests));

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
        manual: item.manual,
        explanation: item.explanation,
      });
    }
    return list.sort(
      (a, b) =>
        a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [computed, sep]);

  const listedIds = useMemo(() => new Set(computed.map((item) => item.materialId)), [computed]);
  const addableMaterials = useMemo(
    () =>
      [...cadastros.materials]
        .filter((item) => !listedIds.has(item.id) && !sep.overrides[item.id]?.removed)
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
        ),
    [cadastros.materials, listedIds, sep.overrides],
  );

  const kitPdf: SeparationPdfKit[] = kits.map((kit) => {
    const qty = kitQuantity(kit, event, sep, cadastros);
    return {
      name: kit.name,
      kitQty: qty,
      scaleLabel: kit.scaleBaseId === "base-fixo" ? undefined : kitScaleLabel(kit, cadastros),
      items: kit.items.flatMap((item) => {
        const material = materialById.get(item.materialId);
        if (!material) return [];
        const computedTotal = kitItemComputedTotal(item.qtyPerKit, qty);
        const total = kitItemTotal(kit, item.materialId, item.qtyPerKit, qty, sep.kits?.[kit.id]);
        return [
          {
            name: material.name,
            perKit: item.qtyPerKit,
            total,
            edited: total !== computedTotal,
          },
        ];
      }),
    };
  });

  const extraPdf: SeparationPdfExtra[] = [
    ...extraCatalog
      .filter((item) => sep.extraSelections?.[item.id]?.included)
      .map((item) => ({
        name: item.name,
        quantity: sep.extraSelections?.[item.id]?.quantity || 1,
      })),
    ...sep.extras
      .filter((item) => item.name.trim())
      .map((item) => ({ name: item.name, quantity: item.quantity })),
  ];

  const removedCount = useMemo(
    () => Object.values(sep.overrides).filter((o) => o.removed).length,
    [sep],
  );
  const totalPieces = rows.reduce((sum, row) => sum + row.finalQty, 0);
  const editedCount = rows.filter((row) => row.edited).length;

  const toggleOpen = (key: string) => {
    setOpenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  const addCatalogMaterial = (materialId: string) => {
    if (!materialId) return;
    const added = new Set(sep.addedMaterialIds ?? []);
    added.add(materialId);
    const overrides = { ...sep.overrides };
    if (overrides[materialId]?.removed) {
      const rest = { quantity: overrides[materialId].quantity, note: overrides[materialId].note };
      if (rest.quantity != null || rest.note) overrides[materialId] = rest;
      else delete overrides[materialId];
    }
    applySep({ ...sep, addedMaterialIds: [...added], overrides });
    setPickMaterialId("");
  };

  const generatePdf = async () => {
    const pdfRows: SeparationPdfRow[] = rows.map((row) => ({
      name: row.name,
      category: row.category,
      unit: row.unit,
      quantity: row.finalQty,
      note: row.note,
      edited: row.edited,
    }));
    try {
      await downloadSeparationPdf(event, pdfRows, {
        kits: kitPdf.filter((kit) => kit.kitQty > 0 && kit.items.length > 0),
        extras: extraPdf,
        notes: sep.notes,
      });
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
          <Button
            variant="outline"
            className="h-9 px-4"
            onClick={() => {
              if (window.confirm("Descartar os ajustes da lista de pratos e voltar ao cálculo automático?")) {
                applySep({ ...sep, overrides: {} });
                toast.success("Cálculo restaurado.");
              }
            }}
          >
            <RotateCcw data-icon="inline-start" />
            Restaurar cálculo
          </Button>
          <Button
            className="h-9 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
            onClick={generatePdf}
          >
            <FileDown data-icon="inline-start" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[220px] flex-1 space-y-1.5">
          <span className="field-label">Incluir material do cadastro</span>
          <select
            className={fieldControlClass}
            value={pickMaterialId}
            onChange={(event) => setPickMaterialId(event.target.value)}
          >
            <option value="">Material não vinculado aos pratos…</option>
            {addableMaterials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.category} · {material.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          className="h-10 px-4"
          disabled={!pickMaterialId}
          onClick={() => addCatalogMaterial(pickMaterialId)}
        >
          <Plus data-icon="inline-start" />
          Incluir
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-forest/20 bg-white/60 p-10 text-center">
          <ClipboardList className="mx-auto mb-3 size-7 text-forest/30" />
          <h3 className="font-display text-2xl text-forest">Lista vazia</h3>
          <p className="mt-2 text-sm font-light text-forest/55">
            Selecione pratos na ficha do evento ou inclua um material do cadastro. Kits e extras
            ficam nas seções abaixo.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-forest/8">
                  <th className="field-label px-4 py-2 font-normal">Material</th>
                  <th className="field-label px-2 py-2 font-normal">Categoria</th>
                  <th className="field-label w-28 px-2 py-2 text-right font-normal">
                    Qtd calculada
                  </th>
                  <th className="field-label w-32 px-2 py-2 font-normal">Qtd final</th>
                  <th className="field-label px-2 py-2 font-normal">Observações</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = openKeys.has(row.key);
                  return (
                    <Fragment key={row.key}>
                      <tr
                        className={cn(
                          "border-b border-forest/5",
                          row.edited && "bg-[#FEF6D9]",
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? "Ocultar cálculo" : "Ver cálculo"}
                              onClick={() => toggleOpen(row.key)}
                              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-forest/45 hover:bg-forest/5 hover:text-forest"
                            >
                              <ChevronDown
                                className={cn("size-4 transition-transform", open && "rotate-180")}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleOpen(row.key)}
                              className="text-left"
                            >
                              <span className="font-list font-medium text-forest">
                                {row.name}
                                {row.manual ? (
                                  <Chip size="sm" className="ml-2 bg-forest/10 text-forest/70">
                                    sem prato
                                  </Chip>
                                ) : null}
                                {row.edited ? (
                                  <Chip size="sm" className="ml-2 bg-[#B8860B]/15 text-[#8a6d0b]">
                                    editado
                                  </Chip>
                                ) : null}
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-forest/70">{row.category}</td>
                        <td className="px-2 py-2.5 text-right text-forest/55">{row.computedQty}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              className={cn(fieldControlClass, "h-9 w-20")}
                              value={row.finalQty}
                              onChange={(e) =>
                                setOverride(row.materialId!, { quantity: Number(e.target.value) }, row.computedQty)
                              }
                            />
                            <span className="text-xs text-forest/45">{row.unit}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <input
                            className={cn(fieldControlClass, "h-9")}
                            placeholder="—"
                            value={row.note}
                            onChange={(e) =>
                              setOverride(row.materialId!, { note: e.target.value }, row.computedQty)
                            }
                          />
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            aria-label="Remover"
                            onClick={() => {
                              if (row.manual) {
                                const overrides = { ...sep.overrides };
                                delete overrides[row.materialId!];
                                applySep({
                                  ...sep,
                                  addedMaterialIds: (sep.addedMaterialIds ?? []).filter(
                                    (id) => id !== row.materialId,
                                  ),
                                  overrides,
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
                      {open ? (
                        <tr className="border-b border-forest/5 bg-forest/[0.03]">
                          <td colSpan={6} className="px-4 py-3 pl-14">
                            <CalculationDetail row={row} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <KitsOnEvent
        kits={kits}
        event={event}
        cadastros={cadastros}
        sep={sep}
        materialById={materialById}
        onChange={applySep}
      />

      <ExtrasOnEvent extras={extraCatalog} sep={sep} onChange={applySep} />

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <h2 className="font-section mb-3 text-[0.82rem] text-forest">Observação geral do evento</h2>
        <textarea
          className={cn(fieldControlClass, "h-24 py-2")}
          placeholder="Observações gerais para este evento…"
          value={sep.notes ?? ""}
          onChange={(e) => applySep({ ...sep, notes: e.target.value })}
        />
      </section>

      <EventDrinksFields
        drinks={drinks}
        onChange={(key: DrinkKey, value: string) =>
          persistEvent({
            drinksAuto: false,
            drinks: { ...drinks, [key]: value },
          })
        }
        onRecalculate={() =>
          persistEvent({
            drinksAuto: true,
            drinks: suggestedDrinkQuantities(guestTotal(event.guests)),
          })
        }
      />

      <EventUniformsFields
        uniforms={event.uniforms}
        onChange={(piece: UniformPieceKey, size: UniformSize, value: number) =>
          persistEvent({
            uniforms: {
              ...event.uniforms,
              [piece]: { ...event.uniforms[piece], [size]: value },
            },
          })
        }
      />
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

function formatQty(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function CalculationDetail({ row }: { row: Row }) {
  if (row.manual) {
    return (
      <div className="space-y-2 text-sm text-forest/75">
        <p className="font-light">
          Incluído na mão, sem vínculo com prato do cardápio. A quantidade calculada usa a
          proporção cadastrada no material.
        </p>
        <ProportionSteps row={row} />
      </div>
    );
  }

  return <ProportionSteps row={row} />;
}

function ProportionSteps({ row }: { row: Row }) {
  const explanation = row.explanation;
  if (!explanation || explanation.missingProportion) {
    return (
      <p className="text-sm font-light text-forest/65">
        Sem proporção definida neste material. A quantidade calculada fica em 0 até o cadastro
        receber uma fórmula.
      </p>
    );
  }

  const formula = explanation.factors
    .map((factor) => `(${factor.baseLabel} × ${formatQty(factor.multiplier)})`)
    .join(" × ");

  return (
    <div className="space-y-2 text-sm text-forest/75">
      {row.manual ? null : (
        <p className="font-light">
          Aparece nesta lista porque entra em{" "}
          <span className="font-medium text-forest">{explanation.occurrence}</span>{" "}
          prato{explanation.occurrence === 1 ? "" : "s"} do cardápio deste evento.
        </p>
      )}
      <ul className="space-y-1">
        {explanation.factors.map((factor, index) => (
          <li key={`${factor.baseLabel}-${index}`}>
            <span className="font-medium text-forest">{factor.baseLabel}</span>
            {factor.source ? (
              <span className="font-light text-forest/55"> ({factor.source})</span>
            ) : null}
            : {formatQty(factor.baseValue)} neste evento × fator {formatQty(factor.multiplier)} ={" "}
            {formatQty(factor.product)}
          </li>
        ))}
      </ul>
      <p className="font-light">
        Cálculo: {formula} = {formatQty(explanation.product)}
        {explanation.rounded !== explanation.product
          ? `, arredondado para cima: ${explanation.rounded}`
          : ""}
        {row.unit ? ` ${row.unit}` : ""}.
      </p>
    </div>
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

function ScaleBadge({ label }: { label: string }) {
  return (
    <Chip size="sm" className="inline-flex items-center gap-1 bg-amber-100 font-medium text-amber-800">
      <Bolt className="size-3 shrink-0" />
      {label}
    </Chip>
  );
}

function KitsOnEvent({
  kits,
  event,
  cadastros,
  sep,
  materialById,
  onChange,
}: {
  kits: MaterialKit[];
  event: EventRecord;
  cadastros: CadastrosData;
  sep: MaterialSeparationState;
  materialById: Map<string, { name: string; unit: string }>;
  onChange: (next: MaterialSeparationState) => void;
}) {
  const patchKit = (kitId: string, patch: { quantity?: number; itemTotals?: Record<string, number> }) => {
    const current = sep.kits?.[kitId] ?? {};
    onChange({
      ...sep,
      kits: {
        ...sep.kits,
        [kitId]: { ...current, ...patch },
      },
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-section text-[0.82rem] text-forest">Kits de materiais</h2>
          <p className="mt-1 text-xs font-light text-forest/50">
            Informe quantos kits vão para o evento. O total de cada item é quantidade por kit ×
            kits, e pode ser ajustado neste evento.
          </p>
        </div>
        <Link
          href="/cadastros/kits"
          className="text-xs font-light text-forest/55 underline-offset-2 hover:text-forest hover:underline"
        >
          Gerenciar kits
        </Link>
      </div>

      {kits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-forest/20 bg-white/60 p-8 text-center">
          <p className="text-sm font-light text-forest/55">
            Nenhum kit cadastrado. Crie kits em Cadastros → Kits de Materiais.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kits.map((kit) => {
            const qty = kitQuantity(kit, event, sep, cadastros);
            const state = sep.kits?.[kit.id];
            const scaleLabel = kitScaleLabel(kit, cadastros);
            return (
              <article
                key={kit.id}
                className="overflow-hidden rounded-2xl border border-forest/10 bg-white"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 bg-petrol px-4 py-3 text-cream">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-section text-[0.78rem]">{kit.name}</h3>
                    {kit.scaleBaseId !== "base-fixo" ? <ScaleBadge label={scaleLabel} /> : null}
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="opacity-80">Qtd de kits</span>
                    <input
                      type="number"
                      min={0}
                      className="h-8 w-16 rounded-md border-0 bg-white px-2 text-sm text-forest"
                      value={qty}
                      onChange={(e) => patchKit(kit.id, { quantity: Number(e.target.value) })}
                    />
                  </label>
                </header>
                <p className="border-b border-forest/8 px-4 py-2 text-xs font-light text-forest/50">
                  Qtd por kit × {qty} kit{qty === 1 ? "" : "s"} = total a separar
                </p>
                {kit.items.length === 0 ? (
                  <p className="px-4 py-3 text-sm font-light text-forest/45">
                    Este kit ainda não tem materiais.
                  </p>
                ) : (
                  <ul>
                    {kit.items.map((item, index) => {
                      const material = materialById.get(item.materialId);
                      const computedTotal = kitItemComputedTotal(item.qtyPerKit, qty);
                      const total = kitItemTotal(
                        kit,
                        item.materialId,
                        item.qtyPerKit,
                        qty,
                        state,
                      );
                      return (
                        <li
                          key={`${item.materialId}-${index}`}
                          className="flex items-center gap-3 border-b border-forest/8 px-4 py-2 last:border-0"
                        >
                          <span className="min-w-0 flex-1 text-sm text-forest">
                            {item.qtyPerKit}x {material?.name ?? "Material removido"}
                          </span>
                          <span className="field-label">Total</span>
                          <input
                            type="number"
                            min={0}
                            className={cn(fieldControlClass, "h-9 w-20")}
                            value={total}
                            onChange={(e) => {
                              const itemTotals = {
                                ...(state?.itemTotals ?? {}),
                                [item.materialId]: Number(e.target.value),
                              };
                              patchKit(kit.id, { itemTotals });
                            }}
                          />
                          {total !== computedTotal ? (
                            <button
                              type="button"
                              className="text-xs font-light text-forest/45 hover:text-forest"
                              onClick={() => {
                                const itemTotals = { ...(state?.itemTotals ?? {}) };
                                delete itemTotals[item.materialId];
                                patchKit(kit.id, { itemTotals });
                              }}
                            >
                              restaurar
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ExtrasOnEvent({
  extras,
  sep,
  onChange,
}: {
  extras: { id: string; name: string }[];
  sep: MaterialSeparationState;
  onChange: (next: MaterialSeparationState) => void;
}) {
  const setSelection = (id: string, included: boolean, quantity: number) => {
    onChange({
      ...sep,
      extraSelections: {
        ...sep.extraSelections,
        [id]: { included, quantity },
      },
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
      <header className="flex items-center justify-between gap-3 bg-forest/[0.06] px-4 py-3">
        <h2 className="font-section text-[0.82rem] text-forest">Extras / Equipamentos</h2>
        <Button
          variant="outline"
          className="h-8 px-3"
          onClick={() =>
            onChange({
              ...sep,
              extras: [
                ...sep.extras,
                { id: uid(), name: "", category: "Extras", unit: "un", quantity: 1 },
              ],
            })
          }
        >
          <Plus data-icon="inline-start" />
          Item avulso
        </Button>
      </header>
      {extras.length === 0 && sep.extras.length === 0 ? (
        <p className="px-4 py-6 text-sm font-light text-forest/50">
          Cadastre extras em Cadastros → Kits de Materiais, ou adicione um item avulso.
        </p>
      ) : (
        <ul>
          {extras.map((item) => {
            const selection = sep.extraSelections?.[item.id];
            const included = selection?.included ?? false;
            const quantity = selection?.quantity ?? 1;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-forest/8 px-4 py-2.5"
              >
                <input
                  type="checkbox"
                  aria-label={item.name}
                  className="size-4 accent-forest"
                  checked={included}
                  onChange={(e) => setSelection(item.id, e.target.checked, quantity || 1)}
                />
                <span className="min-w-0 flex-1 text-sm text-forest">{item.name}</span>
                <span className="field-label">Qtd.</span>
                <input
                  type="number"
                  min={0}
                  className={cn(fieldControlClass, "h-9 w-20")}
                  value={quantity}
                  disabled={!included}
                  onChange={(e) => setSelection(item.id, included, Number(e.target.value))}
                />
              </li>
            );
          })}
          {sep.extras.map((extra) => (
            <li
              key={extra.id}
              className="flex items-center gap-3 border-b border-forest/8 px-4 py-2.5 last:border-0"
            >
              <input
                className={cn(fieldControlClass, "h-9 flex-1")}
                placeholder="Material avulso"
                value={extra.name}
                onChange={(e) =>
                  onChange({
                    ...sep,
                    extras: sep.extras.map((item) =>
                      item.id === extra.id ? { ...item, name: e.target.value } : item,
                    ),
                  })
                }
              />
              <span className="field-label">Qtd.</span>
              <input
                type="number"
                min={0}
                className={cn(fieldControlClass, "h-9 w-20")}
                value={extra.quantity}
                onChange={(e) =>
                  onChange({
                    ...sep,
                    extras: sep.extras.map((item) =>
                      item.id === extra.id ? { ...item, quantity: Number(e.target.value) } : item,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label="Remover extra"
                className="flex size-8 items-center justify-center rounded-lg text-forest/35 hover:bg-terracotta/10 hover:text-terracotta"
                onClick={() =>
                  onChange({
                    ...sep,
                    extras: sep.extras.filter((item) => item.id !== extra.id),
                  })
                }
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
