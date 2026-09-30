"use client";

import {
  AlertTriangle,
  ChevronDown,
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
import { CatalogFilters, Chip, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { EventDrinksFields } from "@/components/events/drinks-uniforms";
import { useEvents } from "@/components/events/events-provider";
import { compareDateSort } from "@/components/date-sort";
import { EventCalendar } from "@/components/events/event-calendar";
import { fieldControlClass } from "@/components/events/field";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardHeader } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { QtyInput } from "@/components/ui/qty-input";
import { StatusPill } from "@/components/ui/status-pill";
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
import { formatInt } from "@/lib/crm/format";
import {
  allocationWindow,
  eventsWithRupture,
  rupturesForEvent,
} from "@/lib/logistica/alocacao";
import { computeBalances } from "@/lib/logistica/calc";
import {
  drinkSeparationLines,
  guestTotal,
  normalizeMaterialSeparation,
  suggestedDrinkQuantities,
  DEFAULT_DRINK_PREMISES,
  type DrinkKey,
  type EventRecord,
  type MaterialSeparationOverride,
  type MaterialSeparationState,
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
  dishNames: string[];
  explanation?: QuantityExplanation;
}

export function SeparacaoMateriais() {
  const { events, ready } = useEvents();
  const { data: cadastros } = useCadastros();
  const { data: logistica } = useLogistica();
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

  const ruptureIds = useMemo(() => {
    if (!cadastros) return new Set<string>();
    return eventsWithRupture(events, cadastros, computeBalances(logistica?.movements ?? []));
  }, [events, cadastros, logistica]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...events]
      .sort((a, b) => {
        const byDate = compareDateSort(a.date, b.date, "desc");
        return byDate || a.title.localeCompare(b.title, "pt-BR");
      })
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
    <PageShell fillViewport width="wide" eyebrow="Logística" title="Separação de Materiais">
      {!ready ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LoadingBlock />
        </div>
      ) : events.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
        <EmptyBlock
          title="Nenhum evento"
          description="Crie um relatório de evento para separar materiais."
          action={
            <Link href="/eventos/novo" className={cn(buttonVariants(), "h-10 px-5")}>
              Novo relatório
            </Link>
          }
        />
        </div>
      ) : (
        <>
          <div className="shrink-0">
          <CatalogFilters
            compact
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar evento…"
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
          </div>
          {filtered.length === 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
            <EmptyBlock
              title="Nenhum evento encontrado"
              description="Ajuste a busca ou os filtros para localizar o relatório."
            />
            </div>
          ) : (
            <EventCalendar
              fill
              events={filtered}
              hrefForEvent={(event) => `/logistica/separacao-materiais/${event.id}`}
              emptyDescription="Ajuste a busca ou os filtros, ou mude o mês para localizar o relatório."
              marked={(event) => ruptureIds.has(event.id)}
              badge={(event) =>
                ruptureIds.has(event.id) ? <StatusPill tone="danger">Ruptura</StatusPill> : null
              }
            />
          )}
        </>
      )}
    </PageShell>
  );
}

export function SeparacaoMateriaisEvent({ eventId }: { eventId: string }) {
  const { ready: eventsReady, getEvent, upsert } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const event = getEvent(eventId);
  const ready = eventsReady && cadastrosReady;

  if (!ready) {
    return <LoadingBlock />;
  }

  if (!event) {
    return (
      <PageShell title="Evento não encontrado">
        <EmptyBlock
          title="Evento não encontrado"
          description="Este relatório pode ter sido excluído neste aparelho."
          action={
            <Link
              href="/logistica/separacao-materiais"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
            >
              Voltar à lista
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={event.title || "Evento sem nome"}
      back={
        <Link
          href="/logistica/separacao-materiais"
          className="text-sm text-forest/55 hover:text-forest"
        >
          ← Eventos
        </Link>
      }
      description={
        <>
          <span className="block tabular">
            {event.date ? formatShortDate(event.date) : "Sem data"}
            {event.code ? ` · ${event.code}` : ""}
          </span>
          <span className="mt-1 block tabular">
            Entrega de material{" "}
            {event.materialDeliveryDate ? formatShortDate(event.materialDeliveryDate) : "a definir"}
            {" · "}
            Recolhimento de material{" "}
            {event.materialPickupDate ? formatShortDate(event.materialPickupDate) : "a definir"}
          </span>
        </>
      }
      actions={
        <Link
          href={`/eventos/${event.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          Abrir relatório
        </Link>
      }
    >
      {cadastros ? (
        <SeparationEditor key={event.id} event={event} cadastros={cadastros} onSave={upsert} />
      ) : (
        <EmptyBlock title="Não foi possível carregar os cadastros." description="Recarregue a página." />
      )}
    </PageShell>
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
  const { events } = useEvents();
  const { data: logistica } = useLogistica();
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
  const liveEvent = useMemo(
    () => ({ ...event, materialSeparation: sep }),
    [event, sep],
  );
  const ruptures = useMemo(
    () =>
      rupturesForEvent(
        liveEvent,
        events,
        cadastros,
        computeBalances(logistica?.movements ?? []),
      ),
    [liveEvent, events, cadastros, logistica],
  );
  const ruptureById = useMemo(
    () => new Map(ruptures.map((item) => [item.materialId, item])),
    [ruptures],
  );
  const ruptureIds = useMemo(() => new Set(ruptureById.keys()), [ruptureById]);
  const allocWindow = allocationWindow(liveEvent);

  const drinkPremises = cadastros?.drinkPremises ?? DEFAULT_DRINK_PREMISES;
  const drinks =
    event.drinksAuto === false
      ? event.drinks
      : suggestedDrinkQuantities(guestTotal(event.guests), drinkPremises);

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
        edited: override?.quantity != null && override.quantity !== item.computedQty,
        manual: item.manual,
        dishNames: item.dishNames,
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
      dishes: row.dishNames.join(", "),
      note: row.note,
      edited: row.edited,
    }));
    try {
      await downloadSeparationPdf(event, pdfRows, {
        kits: kitPdf.filter((kit) => kit.kitQty > 0 && kit.items.length > 0),
        extras: extraPdf,
        drinks: drinkSeparationLines(
          guestTotal(event.guests),
          drinkPremises,
          drinks,
          event.drinksAuto !== false,
        ),
        notes: sep.notes,
      });
      toast.success("PDF de separação baixado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <EventSummary event={event} />

      {warnings.length > 0 ? (
        <CollapsibleAlert
          tone="warn"
          title={`Complete o relatório para uma separação precisa${warnings.length ? ` · ${warnings.length}` : ""}`}
        >
          <p>{warnings.map((w) => w.label).join(" · ")}</p>
        </CollapsibleAlert>
      ) : null}

      {ruptures.length > 0 ? (
        <CollapsibleAlert
          tone="danger"
          title={`Ruptura de estoque nesta alocação · ${ruptures.length} material${ruptures.length === 1 ? "" : "is"}`}
        >
          {allocWindow ? (
            <p className="text-forest/70 tabular">
              {formatShortDate(allocWindow.start)} → {formatShortDate(allocWindow.end)}
            </p>
          ) : null}
          <p className="mt-1 text-forest/70">
            {ruptures.length === 1
              ? "1 material não cabe no estoque"
              : `${ruptures.length} materiais não cabem no estoque`}{" "}
            com os eventos simultâneos (entrega até recolhimento).
          </p>
          <ul className="mt-2 space-y-1 text-sm text-forest/80 tabular">
            {ruptures.slice(0, 6).map((item) => (
              <li key={item.materialId}>
                <span className="font-medium">{item.name}</span>
                {item.unit ? ` (${item.unit})` : ""}: estoque {formatInt(item.stock)} · este
                evento {formatInt(item.thisEventQty)} · pico {formatInt(item.peak)} · falta{" "}
                {formatInt(item.shortage)}
                {item.others.length > 0
                  ? ` · junto com ${item.others.map((other) => other.title).join(", ")}`
                  : ""}
              </li>
            ))}
          </ul>
          {ruptures.length > 6 ? (
            <p className="meta-text mt-1">
              e mais {ruptures.length - 6} material(is)
            </p>
          ) : null}
          <Link
            href="/logistica/alocacao-materiais"
            className="mt-2 inline-block text-sm text-danger underline-offset-2 hover:underline"
          >
            Ver controle de alocação
          </Link>
        </CollapsibleAlert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-forest/70">
          {removedCount > 0 ? (
            <button
              type="button"
              onClick={restoreRemoved}
              className="text-forest underline underline-offset-2 hover:text-petrol"
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
          <Button className="h-9 px-4" onClick={generatePdf}>
            <FileDown data-icon="inline-start" />
            Gerar PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[220px] flex-1 space-y-1.5">
          <span className="field-label">Incluir material do cadastro</span>
          <SearchableSelect
            value={pickMaterialId}
            onChange={setPickMaterialId}
            emptyLabel="Material não vinculado aos pratos…"
            searchPlaceholder="Pesquisar material…"
            options={addableMaterials.map((material) => ({
              value: material.id,
              label: material.name,
              hint: material.category,
            }))}
          />
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
        <EmptyBlock
          title="Lista vazia"
          description="Selecione pratos no relatório do evento ou inclua um material do cadastro. Kits e extras ficam nas seções abaixo."
        />
      ) : (
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="field-label px-4 py-2 font-normal">Material</th>
                  <th className="field-label px-2 py-2 font-normal">Categoria</th>
                  <th className="field-label w-36 px-2 py-2 font-normal">Quantidade</th>
                  <th className="field-label px-2 py-2 font-normal">Observações</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = openKeys.has(row.key);
                  const rupture = row.materialId ? ruptureById.get(row.materialId) : undefined;
                  return (
                    <Fragment key={row.key}>
                      <tr
                        className={cn(
                          "border-b border-line",
                          rupture ? "bg-danger/[0.06]" : row.edited && "row-edited",
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
                              <span className="font-medium text-forest">
                                {row.name}
                                {row.manual ? (
                                  <Chip size="sm" className="ml-2 bg-forest/10 text-forest/70">
                                    sem prato
                                  </Chip>
                                ) : null}
                                {rupture ? (
                                  <span className="ml-2 align-middle text-xs font-medium text-danger tabular">
                                    −{formatInt(rupture.shortage)}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-forest/70">{row.category}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <QtyInput
                              ariaLabel={`Quantidade de ${row.name}`}
                              edited={row.edited}
                              value={row.finalQty}
                              onChange={(value) =>
                                setOverride(row.materialId!, { quantity: value }, row.computedQty)
                              }
                            />
                            <span className="meta-text">{row.unit}</span>
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
                            className="flex size-8 items-center justify-center rounded-md text-forest/35 transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-line bg-forest/[0.03]">
                          <td colSpan={5} className="px-4 py-3 pl-14">
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
        </Card>
      )}

      <KitsOnEvent
        kits={kits}
        event={event}
        cadastros={cadastros}
        sep={sep}
        materialById={materialById}
        ruptureIds={ruptureIds}
        onChange={applySep}
      />

      <ExtrasOnEvent extras={extraCatalog} sep={sep} onChange={applySep} />

      <Card>
        <h2 className="section-title mb-3">Observação geral do evento</h2>
        <textarea
          className={cn(fieldControlClass, "h-24 py-2")}
          placeholder="Observações gerais para este evento…"
          value={sep.notes || event.logisticsNotes || ""}
          onChange={(e) => {
            const value = e.target.value;
            applySep({ ...sep, notes: value });
            persistEvent({ logisticsNotes: value });
          }}
        />
      </Card>

      <EventDrinksFields
        drinks={drinks}
        notes={event.drinksNotes ?? ""}
        onNotesChange={(value) => persistEvent({ drinksNotes: value })}
        onChange={(key: DrinkKey, value: string) =>
          persistEvent({
            drinksAuto: false,
            drinks: { ...drinks, [key]: value },
          })
        }
        onRecalculate={() =>
          persistEvent({
            drinksAuto: true,
            drinks: suggestedDrinkQuantities(guestTotal(event.guests), drinkPremises),
          })
        }
      />
    </div>
  );
}

function CollapsibleAlert({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "warn" | "danger";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-lg border",
        tone === "danger" ? "border-danger/25 bg-danger/5" : "border-warn/25 bg-warn-soft",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 text-sm font-medium",
            tone === "danger" ? "text-danger" : "text-warn",
          )}
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            tone === "danger" ? "text-danger/70" : "text-warn/70",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="px-4 pb-4 text-sm text-forest">{children}</div> : null}
    </div>
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
        <p>
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
      <p className="meta-text">
        Sem proporção definida neste material. A quantidade calculada fica em 0 até o cadastro
        receber uma fórmula.
      </p>
    );
  }

  const steps = explanation.factors
    .map((factor) => `${formatQty(factor.baseValue)} ${factor.baseLabel} × ${formatQty(factor.multiplier)}`)
    .join(" × ");
  const dishes = row.dishNames;

  return (
    <div className="space-y-1 text-sm text-forest/75">
      {dishes.length > 0 ? (
        <p>
          Entra em {dishes.map((name, index) => (
            <span key={`${name}-${index}`}>
              {index > 0 ? ", " : ""}
              <span className="font-medium text-forest">{name}</span>
            </span>
          ))}
          .
        </p>
      ) : row.manual ? null : (
        <p>Entra pela regra do cadastro, sem prato vinculado pelo nome.</p>
      )}
      <p>
        Cálculo: {steps} = {formatQty(explanation.product)}
        {explanation.rounded !== explanation.product
          ? `, arredondado para ${formatQty(explanation.rounded)}`
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
    <Card as="div" className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-7">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 text-center">
          <p className="text-[22px] font-semibold leading-tight text-forest tabular">{item.value}</p>
          <p className="field-label mt-0.5 truncate">{item.label}</p>
        </div>
      ))}
    </Card>
  );
}

function KitsOnEvent({
  kits,
  event,
  cadastros,
  sep,
  materialById,
  ruptureIds,
  onChange,
}: {
  kits: MaterialKit[];
  event: EventRecord;
  cadastros: CadastrosData;
  sep: MaterialSeparationState;
  materialById: Map<string, { name: string; unit: string }>;
  ruptureIds: Set<string>;
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
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Kits de materiais</h2>
        <Link
          href="/cadastros/kits"
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
        >
          Gerenciar kits
        </Link>
      </div>

      {kits.length === 0 ? (
        <EmptyBlock
          title="Nenhum kit cadastrado"
          description="Crie kits em Cadastros → Kits de Materiais."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => {
            const qty = kitQuantity(kit, event, sep, cadastros);
            const state = sep.kits?.[kit.id];
            const scaleLabel = kitScaleLabel(kit, cadastros);
            return (
              <article
                key={kit.id}
                className="surface-card flex flex-col"
              >
                <header className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
                  <div className="min-w-0">
                    <h3 className="section-title">{kit.name}</h3>
                    {kit.scaleBaseId !== "base-fixo" ? (
                      <p className="meta-text mt-0.5">{scaleLabel}</p>
                    ) : null}
                  </div>
                  <label className="flex shrink-0 items-center gap-2">
                    <span className="field-label">Kits</span>
                    <QtyInput
                      size="sm"
                      ariaLabel={`Quantidade de kits ${kit.name}`}
                      value={qty}
                      onChange={(value) => patchKit(kit.id, { quantity: value })}
                    />
                  </label>
                </header>
                {kit.items.length === 0 ? (
                  <p className="meta-text px-3 py-2">Sem materiais neste kit.</p>
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
                          className={cn(
                            "flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-0",
                            ruptureIds.has(item.materialId) && "bg-danger/[0.06]",
                          )}
                        >
                          <span className="min-w-0 flex-1 text-[13px] leading-snug text-forest">
                            <span className="tabular">{item.qtyPerKit}×</span> {material?.name ?? "Removido"}
                            {ruptureIds.has(item.materialId) ? (
                              <span className="ml-1 text-danger">ruptura</span>
                            ) : null}
                          </span>
                          <QtyInput
                            size="sm"
                            ariaLabel={`Total de ${material?.name ?? "material"}`}
                            edited={total !== computedTotal}
                            value={total}
                            onChange={(value) => {
                              const itemTotals = {
                                ...(state?.itemTotals ?? {}),
                                [item.materialId]: value,
                              };
                              patchKit(kit.id, { itemTotals });
                            }}
                          />
                          <span className="w-14 shrink-0 text-right">
                            {total !== computedTotal ? (
                              <button
                                type="button"
                                className="text-xs text-forest/50 hover:text-forest"
                                onClick={() => {
                                  const itemTotals = { ...(state?.itemTotals ?? {}) };
                                  delete itemTotals[item.materialId];
                                  patchKit(kit.id, { itemTotals });
                                }}
                              >
                                restaurar
                              </button>
                            ) : null}
                          </span>
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
    <Card flush>
      <CardHeader
        title="Extras / Equipamentos"
        className="border-b border-line px-4 py-3"
        actions={
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
        }
      />
      {extras.length === 0 && sep.extras.length === 0 ? (
        <p className="meta-text px-4 py-6">
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
                className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0"
              >
                <input
                  type="checkbox"
                  aria-label={item.name}
                  className="size-4 accent-forest"
                  checked={included}
                  onChange={(e) => setSelection(item.id, e.target.checked, quantity || 1)}
                />
                <span className="min-w-0 flex-1 text-sm text-forest">{item.name}</span>
                <span className="field-label hidden sm:inline">Quantidade</span>
                <QtyInput
                  ariaLabel={`Quantidade de ${item.name}`}
                  value={quantity}
                  disabled={!included}
                  onChange={(value) => setSelection(item.id, included, value)}
                />
                <span className="size-8 shrink-0" aria-hidden />
              </li>
            );
          })}
          {sep.extras.map((extra) => (
            <li
              key={extra.id}
              className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0"
            >
              <input
                className={cn(fieldControlClass, "h-9 min-w-0 flex-1")}
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
              <span className="field-label hidden sm:inline">Quantidade</span>
              <QtyInput
                ariaLabel={`Quantidade de ${extra.name || "material avulso"}`}
                value={extra.quantity}
                onChange={(value) =>
                  onChange({
                    ...sep,
                    extras: sep.extras.map((item) =>
                      item.id === extra.id ? { ...item, quantity: value } : item,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label="Remover extra"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-forest/35 hover:bg-danger/10 hover:text-danger"
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
    </Card>
  );
}
