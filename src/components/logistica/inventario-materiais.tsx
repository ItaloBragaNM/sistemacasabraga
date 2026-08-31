"use client";

import { ArrowLeft, ClipboardCheck, Eye, FileDown, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { downloadCountSheetPdf } from "@/components/logistica/inventario-pdf";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import {
  skuBalance,
  computeBalances,
  inventoryItemLabel,
  stockKey,
  stockSkusForMaterial,
} from "@/lib/logistica/calc";
import type { InventorySession } from "@/lib/logistica/types";
import type { MaterialRecord } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function InventarioMateriais() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady, concludeInventory, updateInventory } = useLogistica();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [editing, setEditing] = useState<InventorySession | null>(null);
  const [viewing, setViewing] = useState<InventorySession | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  const balances = useMemo(() => computeBalances(logistica?.movements ?? []), [logistica]);
  const materialById = useMemo(
    () => new Map((cadastros?.materials ?? []).map((m) => [m.id, m])),
    [cadastros],
  );
  const locationName = useMemo(
    () => new Map((cadastros?.stockLocations ?? []).map((item) => [item.id, item.name])),
    [cadastros],
  );
  const balancesWithoutEdit = useMemo(() => {
    if (!logistica || !editing) return balances;
    return computeBalances(logistica.movements.filter((movement) => movement.ref !== editing.id));
  }, [logistica, editing, balances]);

  const ready = cadReady && logReady;

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <CadastrosHeader eyebrow="Logística" title="Inventário de Materiais" description="Contagem física do estoque." />
        <LoadingBlock />
      </div>
    );
  }

  if (!cadastros || !logistica) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <CadastrosHeader eyebrow="Logística" title="Inventário de Materiais" description="Contagem física do estoque." />
        <EmptyBlock title="Indisponível" description="Recarregue a página." />
      </div>
    );
  }

  if (mode === "new" || editing) {
    return (
      <InventoryForm
        materials={cadastros.materials}
        materialById={materialById}
        locations={cadastros.stockLocations ?? []}
        locationName={locationName}
        balances={editing ? balancesWithoutEdit : balances}
        initial={editing}
        onCancel={() => {
          setMode("list");
          setEditing(null);
        }}
        onConclude={(session) => {
          if (editing) {
            updateInventory({ ...session, id: editing.id, createdAt: editing.createdAt });
            setEditing(null);
            setMode("list");
            toast.success("Inventário atualizado — estoque ajustado.");
          } else {
            concludeInventory(session);
            setMode("list");
            toast.success("Inventário concluído — estoque atualizado.");
          }
        }}
      />
    );
  }

  const inventories = [...logistica.inventories].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Logística"
        title="Inventário de Materiais"
        description="Cada variação é um item a contar. Informe a data e quem participou. Gere um PDF para contar no papel e lance os números depois."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-10 px-4"
              onClick={() => setPdfOpen(true)}
              disabled={cadastros.materials.length === 0}
            >
              <FileDown data-icon="inline-start" />
              PDF para contagem
            </Button>
            <Button
              className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
              onClick={() => setMode("new")}
              disabled={cadastros.materials.length === 0}
            >
              <Plus data-icon="inline-start" />
              Novo inventário
            </Button>
          </div>
        }
      />

      {inventories.length === 0 ? (
        <EmptyBlock
          title="Nenhum inventário"
          description="Imprima a folha de contagem ou faça a primeira contagem no sistema."
          action={
            <Button
              className="bg-forest text-cream hover:bg-petrol"
              onClick={() => setMode("new")}
              disabled={cadastros.materials.length === 0}
            >
              <Plus data-icon="inline-start" />
              Novo inventário
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-3 pl-5 font-normal">Data</th>
                <th className="field-label py-3 font-normal">Responsável</th>
                <th className="field-label py-3 font-normal">Participantes</th>
                <th className="field-label py-3 text-right font-normal">Itens</th>
                <th className="field-label py-3 text-right font-normal">Ajustes</th>
                <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((session) => {
                const changed = session.items.filter((i) => i.counted !== i.previous).length;
                const people = session.participants ?? [];
                return (
                  <tr key={session.id} className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]">
                    <td className="py-3 pl-5 font-list text-forest">{formatShortDate(session.date.slice(0, 10))}</td>
                    <td className="py-3 text-forest/70">{session.responsible || "—"}</td>
                    <td className="py-3 text-forest/70">{people.length ? people.join(", ") : "—"}</td>
                    <td className="py-3 text-right text-forest/70">{session.items.length}</td>
                    <td className="py-3 text-right text-forest/70">{changed}</td>
                    <td className="py-3 pr-5">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setViewing(session)}>
                          <Eye data-icon="inline-start" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => {
                            setViewing(null);
                            setEditing(session);
                          }}
                        >
                          <Pencil data-icon="inline-start" />
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing ? (
        <Modal open onClose={() => setViewing(null)} title={`Inventário · ${formatShortDate(viewing.date.slice(0, 10))}`} wide>
          <div className="space-y-3">
            {viewing.responsible ? (
              <p className="text-sm text-forest/60">Responsável: {viewing.responsible}</p>
            ) : null}
            {(viewing.participants ?? []).length > 0 ? (
              <p className="text-sm text-forest/60">
                Participantes da contagem: {viewing.participants.join(", ")}
              </p>
            ) : null}
            {viewing.note ? <p className="text-sm font-light text-forest/60">{viewing.note}</p> : null}
            <div className="overflow-hidden rounded-xl border border-forest/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10 bg-forest/[0.02]">
                    <th className="field-label py-2 pl-4 font-normal">Material / variação</th>
                    <th className="field-label py-2 text-right font-normal">Anterior</th>
                    <th className="field-label py-2 text-right font-normal">Contado</th>
                    <th className="field-label py-2 pr-4 text-right font-normal">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item) => {
                    const diff = item.counted - item.previous;
                    return (
                      <tr
                        key={stockKey(item.materialId, item.variant)}
                        className="border-b border-forest/5 last:border-0"
                      >
                        <td className="py-2 pl-4 text-forest">
                          {inventoryItemLabel(materialById.get(item.materialId), item.variant, item.materialId)}
                        </td>
                        <td className="py-2 text-right text-forest/60">{formatInt(item.previous)}</td>
                        <td className="py-2 text-right text-forest">{formatInt(item.counted)}</td>
                        <td
                          className={cn(
                            "py-2 pr-4 text-right font-medium",
                            diff === 0 ? "text-forest/40" : diff > 0 ? "text-forest" : "text-terracotta",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatInt(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button
                className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
                onClick={() => {
                  setViewing(null);
                  setEditing(viewing);
                }}
              >
                <Pencil data-icon="inline-start" />
                Editar inventário
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {pdfOpen ? (
        <CountSheetModal
          materials={cadastros.materials}
          locations={cadastros.stockLocations ?? []}
          locationName={locationName}
          onClose={() => setPdfOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CountSheetModal({
  materials,
  locations,
  locationName,
  onClose,
}: {
  materials: import("@/lib/cadastros/types").MaterialRecord[];
  locations: { id: string; name: string }[];
  locationName: Map<string, string>;
  onClose: () => void;
}) {
  const categories = useMemo(
    () => [...new Set(materials.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [materials],
  );
  const [date, setDate] = useState(todayIsoDate());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set(categories));
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(() => {
    const ids = new Set(locations.map((item) => item.id));
    ids.add("__none__");
    return ids;
  });

  const toggle = (set: Set<string>, value: string, all: string[]) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    if (next.size === 0) return new Set(all);
    return next;
  };

  const generate = async () => {
    const rows = materials
      .filter((item) => selectedCategories.has(item.category))
      .filter((item) => {
        const key = item.locationId || "__none__";
        return selectedLocations.has(key);
      })
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
      )
      .flatMap((item) =>
        stockSkusForMaterial(item).map((sku) => ({
          name: sku.label,
          category: item.category,
          location: item.locationId ? locationName.get(item.locationId) ?? "" : "",
          unit: item.unit,
        })),
      );
    if (rows.length === 0) {
      toast.error("Nenhum material nessas categorias e locais.");
      return;
    }
    const catLabel =
      selectedCategories.size === categories.length
        ? "todas as categorias"
        : [...selectedCategories].join(", ");
    const locLabel =
      selectedLocations.size === locations.length + 1
        ? "todos os locais"
        : [...selectedLocations]
            .map((id) => (id === "__none__" ? "sem local" : locationName.get(id) ?? id))
            .join(", ");
    try {
      await downloadCountSheetPdf({
        date,
        rows,
        filters: `Inclui ${catLabel} · ${locLabel}`,
      });
      toast.success("PDF de contagem baixado.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <Modal open onClose={onClose} title="PDF para contagem manual" wide>
      <div className="space-y-5">
        <p className="text-sm font-light text-forest/60">
          Folha para imprimir, anotar as quantidades e lançar depois no sistema. Cada variação
          aparece em uma linha. Escolha todas as categorias e locais ou só alguns.
        </p>
        <Field label="Data da contagem">
          <input
            type="date"
            className={fieldControlClass}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="field-label mb-2">Categorias</legend>
            <button
              type="button"
              className="mb-2 text-xs font-light text-forest/55 hover:text-forest"
              onClick={() =>
                setSelectedCategories(
                  selectedCategories.size === categories.length ? new Set() : new Set(categories),
                )
              }
            >
              {selectedCategories.size === categories.length ? "Limpar" : "Selecionar todas"}
            </button>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-forest/10 p-2">
              {categories.map((item) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-forest/[0.03]">
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      checked={selectedCategories.has(item)}
                      onChange={() =>
                        setSelectedCategories((current) => toggle(current, item, categories))
                      }
                    />
                    {item}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <fieldset>
            <legend className="field-label mb-2">Locais</legend>
            <button
              type="button"
              className="mb-2 text-xs font-light text-forest/55 hover:text-forest"
              onClick={() => {
                const all = new Set([...locations.map((item) => item.id), "__none__"]);
                setSelectedLocations(selectedLocations.size === all.size ? new Set() : all);
              }}
            >
              {selectedLocations.size === locations.length + 1 ? "Limpar" : "Selecionar todos"}
            </button>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-forest/10 p-2">
              <li>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-forest/[0.03]">
                  <input
                    type="checkbox"
                    className="size-4 accent-forest"
                    checked={selectedLocations.has("__none__")}
                    onChange={() =>
                      setSelectedLocations((current) =>
                        toggle(current, "__none__", [...locations.map((item) => item.id), "__none__"]),
                      )
                    }
                  />
                  Sem local definido
                </label>
              </li>
              {locations.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-forest/[0.03]">
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      checked={selectedLocations.has(item.id)}
                      onChange={() =>
                        setSelectedLocations((current) =>
                          toggle(current, item.id, [...locations.map((loc) => loc.id), "__none__"]),
                        )
                      }
                    />
                    {item.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="h-10 px-4" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="h-10 bg-terracotta px-5 text-cream hover:bg-terracotta/90" onClick={generate}>
            <FileDown data-icon="inline-start" />
            Gerar PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InventoryForm({
  materials,
  materialById,
  locations,
  locationName,
  balances,
  initial,
  onConclude,
  onCancel,
}: {
  materials: MaterialRecord[];
  materialById: Map<string, MaterialRecord>;
  locations: { id: string; name: string }[];
  locationName: Map<string, string>;
  balances: Map<string, number>;
  initial: InventorySession | null;
  onConclude: (session: InventorySession) => void;
  onCancel: () => void;
}) {
  const recorded = useMemo(() => {
    const map = new Map<string, { previous: number; counted: number }>();
    for (const item of initial?.items ?? []) {
      map.set(stockKey(item.materialId, item.variant), {
        previous: item.previous,
        counted: item.counted,
      });
    }
    return map;
  }, [initial]);

  const previousOf = (materialId: string, variant: string) => {
    const key = stockKey(materialId, variant);
    if (recorded.has(key)) return recorded.get(key)!.previous;
    return skuBalance(balances, materialId, variant);
  };

  const skus = useMemo(() => {
    const catalog = materials.flatMap((material) =>
      stockSkusForMaterial(material, {
        unclassifiedQty:
          skuBalance(balances, material.id, "") ||
          (recorded.has(stockKey(material.id, "")) ? 1 : 0),
      }).map((sku) => ({
        ...sku,
        category: material.category,
        unit: material.unit,
        locationId: material.locationId,
      })),
    );
    const seen = new Set(catalog.map((sku) => stockKey(sku.materialId, sku.variant)));
    const extras = (initial?.items ?? [])
      .filter((item) => !seen.has(stockKey(item.materialId, item.variant)))
      .map((item) => {
        const material = materialById.get(item.materialId);
        return {
          materialId: item.materialId,
          variant: item.variant ?? "",
          label: inventoryItemLabel(material, item.variant, item.materialId),
          category: material?.category ?? "Outros",
          unit: material?.unit ?? "",
          locationId: material?.locationId,
        };
      });
    return [...catalog, ...extras];
  }, [materials, balances, recorded, initial, materialById]);

  const [date, setDate] = useState(initial?.date.slice(0, 10) || todayIsoDate());
  const [responsible, setResponsible] = useState(initial?.responsible ?? "");
  const [participantDraft, setParticipantDraft] = useState("");
  const [participants, setParticipants] = useState<string[]>(initial?.participants ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [category, setCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const [key, item] of recorded) next[key] = item.counted;
    for (const material of materials) {
      for (const sku of stockSkusForMaterial(material, {
        unclassifiedQty: skuBalance(balances, material.id, ""),
      })) {
        const key = stockKey(sku.materialId, sku.variant);
        if (next[key] == null) next[key] = skuBalance(balances, sku.materialId, sku.variant);
      }
    }
    return next;
  });

  const categories = useMemo(
    () => [...new Set(materials.map((m) => m.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [materials],
  );

  const visible = useMemo(
    () =>
      [...skus]
        .filter((sku) => (category ? sku.category === category : true))
        .filter((sku) => {
          if (!locationFilter) return true;
          if (locationFilter === "__none__") return !sku.locationId;
          return sku.locationId === locationFilter;
        })
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category, "pt-BR") || a.label.localeCompare(b.label, "pt-BR"),
        ),
    [skus, category, locationFilter],
  );

  const changedCount = skus.filter((sku) => {
    const key = stockKey(sku.materialId, sku.variant);
    return (counts[key] ?? 0) !== previousOf(sku.materialId, sku.variant);
  }).length;

  const addParticipant = () => {
    const value = participantDraft.trim();
    if (!value) return;
    if (participants.some((name) => name.toLowerCase() === value.toLowerCase())) {
      setParticipantDraft("");
      return;
    }
    setParticipants([...participants, value]);
    setParticipantDraft("");
  };

  const conclude = () => {
    const items = skus.map((sku) => ({
      materialId: sku.materialId,
      variant: sku.variant,
      previous: previousOf(sku.materialId, sku.variant),
      counted: counts[stockKey(sku.materialId, sku.variant)] ?? 0,
    }));
    onConclude({
      id: initial?.id ?? uid(),
      date,
      responsible: responsible.trim(),
      participants,
      note: note.trim(),
      items,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-light text-forest/60 hover:text-forest"
        >
          <ArrowLeft className="size-4" />
          Voltar ao histórico
        </button>
        <h1 className="font-display mt-3 text-4xl text-forest sm:text-5xl">
          {initial ? "Editar inventário" : "Novo inventário"}
        </h1>
        <p className="mt-2 text-sm font-light text-forest/60">
          {initial
            ? "Altere a data, quem participou ou as quantidades. Ao salvar, o estoque é recalculado a partir desta contagem."
            : "Preencha a data, o responsável e quem participou da contagem. Cada variação é um item. A diferença aparece ao lado; ao concluir, o saldo é ajustado."}
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-forest/10 bg-white p-4 sm:grid-cols-2">
        <Field label="Data do inventário">
          <input
            type="date"
            className={fieldControlClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Responsável">
          <input className={fieldControlClass} value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Participantes da contagem">
            <div className="flex gap-2">
              <input
                className={fieldControlClass}
                value={participantDraft}
                onChange={(e) => setParticipantDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder="Nome de quem está contando…"
              />
              <Button variant="outline" className="h-10 px-4" onClick={addParticipant}>
                Incluir
              </Button>
            </div>
          </Field>
          {participants.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {participants.map((name) => (
                <li
                  key={name}
                  className="inline-flex items-center gap-1 rounded-full border border-forest/12 bg-forest/[0.03] py-1 pl-3 pr-1 text-sm text-forest"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Remover ${name}`}
                    className="flex size-6 items-center justify-center rounded-full text-forest/40 hover:text-terracotta"
                    onClick={() => setParticipants((current) => current.filter((item) => item !== name))}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Field label="Observação">
          <input className={fieldControlClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Filtrar categoria">
          <select className={fieldControlClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Filtrar local">
          <select
            className={fieldControlClass}
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="__none__">Sem local</option>
            {locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-forest/60">
          {changedCount > 0 ? `${changedCount} item(ns) com diferença` : "Sem diferenças até agora"}
        </p>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={conclude}>
          <ClipboardCheck data-icon="inline-start" />
          {initial ? "Salvar alterações" : "Concluir inventário"}
        </Button>
      </div>

      {skus.some((sku) => sku.label.endsWith("Não classificado")) ? (
        <p className="rounded-xl border border-terracotta/20 bg-terracotta/[0.06] px-4 py-3 text-sm text-forest/70">
          Há saldo antigo sem variação. Conte cada variação (Liso, Rendado, etc.) e zere a linha
          “Não classificado” para o total não duplicar.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-forest/10">
              <th className="field-label py-3 pl-5 font-normal">Material / variação</th>
              <th className="field-label py-3 font-normal">Local</th>
              <th className="field-label py-3 text-right font-normal">
                {initial ? "Saldo anterior" : "Saldo atual"}
              </th>
              <th className="field-label py-3 font-normal">Contagem</th>
              <th className="field-label py-3 pr-5 text-right font-normal">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((sku) => {
              const key = stockKey(sku.materialId, sku.variant);
              const previous = previousOf(sku.materialId, sku.variant);
              const counted = counts[key] ?? 0;
              const diff = counted - previous;
              return (
                <tr key={key} className="border-b border-forest/5 last:border-0">
                  <td className="py-2.5 pl-5">
                    <p className="font-list font-medium text-forest">{sku.label}</p>
                    <p className="text-xs font-light text-forest/45">
                      {sku.category} · {sku.unit}
                    </p>
                  </td>
                  <td className="py-2.5 text-forest/60">
                    {sku.locationId ? locationName.get(sku.locationId) ?? "—" : "—"}
                  </td>
                  <td className="py-2.5 text-right text-forest/60">{formatInt(previous)}</td>
                  <td className="py-2.5">
                    <input
                      type="number"
                      min={0}
                      className={cn(fieldControlClass, "h-9 w-28")}
                      value={counted}
                      onChange={(e) =>
                        setCounts((current) => ({ ...current, [key]: Number(e.target.value) }))
                      }
                    />
                  </td>
                  <td
                    className={cn(
                      "py-2.5 pr-5 text-right font-medium",
                      diff === 0 ? "text-forest/40" : diff > 0 ? "text-forest" : "text-terracotta",
                    )}
                  >
                    {diff > 0 ? "+" : ""}
                    {formatInt(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
