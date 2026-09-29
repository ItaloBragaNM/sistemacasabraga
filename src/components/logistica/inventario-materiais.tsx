"use client";

import { ArrowDown, ArrowLeft, ArrowUp, ClipboardCheck, Download, Eye, EyeOff, FileDown, Pencil, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CatalogFilters, ChipRow, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { downloadCountSheetPdf, downloadInventorySessionPdf } from "@/components/logistica/inventario-pdf";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { QtyInput } from "@/components/ui/qty-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { exportToXlsx, readXlsx } from "@/lib/cadastros/xlsx";
import {
  skuBalance,
  computeBalances,
  inventoryItemLabel,
  stockKey,
  stockSkusForMaterial,
} from "@/lib/logistica/calc";
import {
  buildInventorySheet,
  parseInventorySheet,
  sessionFromImport,
  type InventoryImportResult,
} from "@/lib/logistica/inventory-io";
import type { InventorySession } from "@/lib/logistica/types";
import type { MaterialRecord } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

function isValidInventoryImport(parsed: InventoryImportResult): boolean {
  if (parsed.counted.length === 0) {
    toast.error("Nenhuma quantidade válida na planilha. Use a coluna Quantidade.");
    return false;
  }
  return true;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function InventarioMateriais() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady, concludeInventory, updateInventory, removeInventory } = useLogistica();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [editing, setEditing] = useState<InventorySession | null>(null);
  const [importDraft, setImportDraft] = useState<InventorySession | null>(null);
  const [viewing, setViewing] = useState<InventorySession | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const deleteInventory = (session: InventorySession) => {
    const label = formatShortDate(session.date.slice(0, 10));
    if (
      !window.confirm(
        `Excluir o inventário de ${label}? Os ajustes de estoque dessa contagem serão desfeitos.`,
      )
    ) {
      return;
    }
    removeInventory(session.id);
    setViewing((current) => (current?.id === session.id ? null : current));
    setEditing((current) => (current?.id === session.id ? null : current));
    toast.success("Inventário excluído.");
  };

  const printSession = async (session: InventorySession) => {
    try {
      await downloadInventorySessionPdf({
        date: session.date.slice(0, 10),
        responsible: session.responsible,
        participants: session.participants ?? [],
        note: session.note,
        skipped: (session.skipped ?? []).length,
        rows: session.items.map((item) => ({
          name: inventoryItemLabel(materialById.get(item.materialId), item.variant, item.materialId),
          category: materialById.get(item.materialId)?.category ?? "Outros",
          previous: item.previous,
          counted: item.counted,
        })),
      });
      toast.success("PDF do inventário baixado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  const exportTemplate = async () => {
    if (!cadastros) return;
    try {
      const { headers, rows } = buildInventorySheet({
        materials: cadastros.materials,
        balances,
        locationName,
      });
      await exportToXlsx("inventario-materiais-casa-braga", "Inventário", headers, rows);
      toast.success("Modelo de inventário exportado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar o modelo.");
    }
  };

  const importSheet = async (file: File) => {
    if (!cadastros) return;
    setImporting(true);
    try {
      const stable = new File([await file.arrayBuffer()], file.name, {
        type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const rows = await readXlsx(stable);
      if (rows.length === 0) {
        toast.error("Planilha vazia ou sem cabeçalho reconhecido.");
        return;
      }
      const parsed = parseInventorySheet(rows, cadastros.materials, balances);
      if (!isValidInventoryImport(parsed)) return;
      const session = sessionFromImport(parsed, cadastros.materials, balances);
      setEditing(null);
      setImportDraft(session);
      setMode("new");
      toast.success(
        parsed.unmatched.length > 0
          ? `Importado: ${parsed.counted.length} item(ns). ${parsed.unmatched.length} linha(s) ignorada(s).`
          : `Importado: ${parsed.counted.length} item(ns) para revisão.`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ler a planilha. Exporte o modelo e use o mesmo formato.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!ready) {
    return (
      <PageShell eyebrow="Logística" title="Inventário de Materiais">
        <LoadingBlock />
      </PageShell>
    );
  }

  if (!cadastros || !logistica) {
    return (
      <PageShell eyebrow="Logística" title="Inventário de Materiais">
        <EmptyBlock title="Indisponível" description="Recarregue a página." />
      </PageShell>
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
        initial={editing ?? importDraft}
        isEditing={Boolean(editing)}
        fromSheet={Boolean(importDraft) && !editing}
        onCancel={() => {
          setMode("list");
          setEditing(null);
          setImportDraft(null);
        }}
        onConclude={(session) => {
          if (editing) {
            updateInventory({ ...session, id: editing.id, createdAt: editing.createdAt });
            setEditing(null);
            setImportDraft(null);
            setMode("list");
            toast.success("Inventário atualizado — estoque ajustado.");
          } else {
            concludeInventory(session);
            setImportDraft(null);
            setMode("list");
            toast.success("Inventário concluído — estoque atualizado.");
          }
        }}
      />
    );
  }

  const inventories = [...logistica.inventories].sort((a, b) => compareDateSort(a.date, b.date, dateSort));

  return (
    <PageShell
      eyebrow="Logística"
      title="Inventário de Materiais"
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importSheet(file);
            }}
          />
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => setPdfOpen(true)}
            disabled={cadastros.materials.length === 0}
          >
            <FileDown data-icon="inline-start" />
            PDF
          </Button>
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => void exportTemplate()}
            disabled={cadastros.materials.length === 0}
          >
            <Download data-icon="inline-start" />
            Modelo
          </Button>
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => fileRef.current?.click()}
            disabled={cadastros.materials.length === 0 || importing}
          >
            <Upload data-icon="inline-start" />
            {importing ? "Importando…" : "Importar"}
          </Button>
          <Button
            className="h-10 px-5"
            onClick={() => {
              setImportDraft(null);
              setMode("new");
            }}
            disabled={cadastros.materials.length === 0}
          >
            <Plus data-icon="inline-start" />
            Novo
          </Button>
        </>
      }
    >
      {inventories.length === 0 ? (
        <EmptyBlock
          title="Nenhum inventário"
          description="Importe uma planilha ou faça a primeira contagem."
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={cadastros.materials.length === 0 || importing}
              >
                <Upload data-icon="inline-start" />
                Importar
              </Button>
              <Button
                onClick={() => {
                  setImportDraft(null);
                  setMode("new");
                }}
                disabled={cadastros.materials.length === 0}
              >
                <Plus data-icon="inline-start" />
                Novo
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          <DateSortSelect value={dateSort} onChange={setDateSort} />
          <Card flush>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="field-label py-3 pl-4 font-normal sm:pl-5">Data</th>
                <th className="field-label px-3 py-3 font-normal">Responsável</th>
                <th className="field-label py-3 text-right font-normal">Ajustes</th>
                <th className="field-label py-3 pr-4 text-right font-normal sm:pr-5" />
              </tr>
            </thead>
            <tbody>
              {inventories.map((session) => {
                const changed = session.items.filter((i) => i.counted !== i.previous).length;
                return (
                  <tr key={session.id} className="border-b border-line last:border-0 hover:bg-forest/[0.02]">
                    <td className="py-3 pl-4 text-forest tabular sm:pl-5">{formatShortDate(session.date.slice(0, 10))}</td>
                    <td className="px-3 py-3 text-forest/70">{session.responsible || "—"}</td>
                    <td className="py-3 text-right text-forest/70 tabular">{changed}</td>
                    <td className="py-3 pr-4 pl-3 sm:pr-5">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="h-8 px-2.5 text-xs sm:px-3"
                          aria-label="Imprimir"
                          onClick={() => void printSession(session)}
                        >
                          <Printer data-icon="inline-start" />
                          <span className="hidden sm:inline">Imprimir</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-2.5 text-xs sm:px-3"
                          aria-label="Ver"
                          onClick={() => setViewing(session)}
                        >
                          <Eye data-icon="inline-start" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </Card>
        </div>
      )}

      {viewing ? (
        <Modal open onClose={() => setViewing(null)} title={`Inventário · ${formatShortDate(viewing.date.slice(0, 10))}`} wide>
          <div className="space-y-3">
            {viewing.responsible ? (
              <p className="meta-text">Responsável: {viewing.responsible}</p>
            ) : null}
            {(viewing.participants ?? []).length > 0 ? (
              <p className="meta-text">
                Participantes da contagem: {viewing.participants.join(", ")}
              </p>
            ) : null}
            {viewing.note ? <p className="meta-text">{viewing.note}</p> : null}
            {(viewing.skipped ?? []).length > 0 ? (
              <p className="meta-text">
                {(viewing.skipped ?? []).length} oculto(s) — saldo inalterado.
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-lg border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-forest/[0.02]">
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
                        className="border-b border-line last:border-0"
                      >
                        <td className="py-2 pl-4 text-forest">
                          {inventoryItemLabel(materialById.get(item.materialId), item.variant, item.materialId)}
                        </td>
                        <td className="py-2 pl-3 text-right text-forest/60 tabular">{formatInt(item.previous)}</td>
                        <td className="py-2 pl-3 text-right text-forest tabular">{formatInt(item.counted)}</td>
                        <td
                          className={cn(
                            "py-2 pr-4 pl-3 text-right font-medium tabular",
                            diff === 0 ? "text-forest/40" : diff > 0 ? "text-forest" : "text-danger",
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
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="h-10" onClick={() => void printSession(viewing)}>
                <Printer data-icon="inline-start" />
                Imprimir
              </Button>
              <Button
                variant="destructive"
                className="h-10"
                onClick={() => deleteInventory(viewing)}
              >
                <Trash2 data-icon="inline-start" />
                Excluir
              </Button>
              <Button
                className="h-10 px-5"
                onClick={() => {
                  setViewing(null);
                  setEditing(viewing);
                }}
              >
                <Pencil data-icon="inline-start" />
                Editar
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
    </PageShell>
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
  const [responsible, setResponsible] = useState("");
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
    if (!responsible.trim()) {
      toast.error("Informe o responsável pela contagem antes de gerar o PDF.");
      return;
    }
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
        responsible: responsible.trim(),
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
    <Modal open onClose={onClose} title="PDF para contagem" wide>
      <div className="space-y-5">
        <p className="meta-text">
          Folha em branco para anotar e lançar depois.
        </p>
        <Field label="Data da contagem">
          <input
            type="date"
            className={fieldControlClass}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Responsável pela contagem">
          <input
            className={fieldControlClass}
            value={responsible}
            onChange={(event) => setResponsible(event.target.value)}
            placeholder="Nome de quem vai contar"
            autoComplete="name"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="field-label mb-2">Categorias</legend>
            <button
              type="button"
              className="mb-2 text-xs text-forest/55 hover:text-forest"
              onClick={() =>
                setSelectedCategories(
                  selectedCategories.size === categories.length ? new Set() : new Set(categories),
                )
              }
            >
              {selectedCategories.size === categories.length ? "Limpar" : "Selecionar todas"}
            </button>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-white p-2">
              {categories.map((item) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-forest/[0.03]">
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
              className="mb-2 text-xs text-forest/55 hover:text-forest"
              onClick={() => {
                const all = new Set([...locations.map((item) => item.id), "__none__"]);
                setSelectedLocations(selectedLocations.size === all.size ? new Set() : all);
              }}
            >
              {selectedLocations.size === locations.length + 1 ? "Limpar" : "Selecionar todos"}
            </button>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-white p-2">
              <li>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-forest/[0.03]">
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
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-forest/[0.03]">
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
          <Button className="h-10 px-5" onClick={generate}>
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
  isEditing,
  fromSheet,
  onConclude,
  onCancel,
}: {
  materials: MaterialRecord[];
  materialById: Map<string, MaterialRecord>;
  locations: { id: string; name: string }[];
  locationName: Map<string, string>;
  balances: Map<string, number>;
  initial: InventorySession | null;
  isEditing: boolean;
  fromSheet?: boolean;
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

  const previousOf = useCallback(
    (materialId: string, variant: string) => {
      const key = stockKey(materialId, variant);
      if (recorded.has(key)) return recorded.get(key)!.previous;
      return skuBalance(balances, materialId, variant);
    },
    [recorded, balances],
  );

  const [importedExtras, setImportedExtras] = useState<InventorySession["items"]>([]);
  const [importedSkipped, setImportedSkipped] = useState<InventorySession["skipped"]>([]);

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
    const extras: typeof catalog = [];
    for (const item of [...(initial?.items ?? []), ...(initial?.skipped ?? []), ...importedExtras, ...importedSkipped]) {
      const key = stockKey(item.materialId, item.variant);
      if (seen.has(key)) continue;
      seen.add(key);
      const material = materialById.get(item.materialId);
      extras.push({
        materialId: item.materialId,
        variant: item.variant ?? "",
        label: inventoryItemLabel(material, item.variant, item.materialId),
        category: material?.category ?? "Outros",
        unit: material?.unit ?? "",
        locationId: material?.locationId,
      });
    }
    return [...catalog, ...extras];
  }, [materials, balances, recorded, initial, materialById, importedExtras, importedSkipped]);

  const [date, setDate] = useState(initial?.date.slice(0, 10) || todayIsoDate());
  const [responsible, setResponsible] = useState(initial?.responsible ?? "");
  const [participantDraft, setParticipantDraft] = useState("");
  const [participants, setParticipants] = useState<string[]>(initial?.participants ?? []);
  const [note, setNote] = useState(initial?.note ?? "");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "category" | "location" | "previous" | "counted" | "diff">(
    "category",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(
    () => new Set((initial?.skipped ?? []).map((item) => stockKey(item.materialId, item.variant))),
  );
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
  const formFileRef = useRef<HTMLInputElement>(null);
  const [formImporting, setFormImporting] = useState(false);

  const importIntoForm = async (file: File) => {
    setFormImporting(true);
    try {
      const stable = new File([await file.arrayBuffer()], file.name, {
        type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const rows = await readXlsx(stable);
      if (rows.length === 0) {
        toast.error("Planilha vazia ou sem cabeçalho reconhecido.");
        return;
      }
      const parsed = parseInventorySheet(rows, materials, balances);
      if (!isValidInventoryImport(parsed)) return;
      const session = sessionFromImport(parsed, materials, balances);
      setDate(session.date.slice(0, 10) || todayIsoDate());
      if (session.responsible) setResponsible(session.responsible);
      if (session.participants.length > 0) setParticipants(session.participants);
      if (session.note) setNote(session.note);
      setHiddenKeys(
        new Set(session.skipped.map((item) => stockKey(item.materialId, item.variant))),
      );
      setImportedExtras(session.items);
      setImportedSkipped(session.skipped);
      setCounts((current) => {
        const next = { ...current };
        for (const item of session.items) {
          next[stockKey(item.materialId, item.variant)] = item.counted;
        }
        return next;
      });
      toast.success(
        parsed.unmatched.length > 0
          ? `Planilha aplicada: ${parsed.counted.length} item(ns). ${parsed.unmatched.length} linha(s) ignorada(s).`
          : `Planilha aplicada: ${parsed.counted.length} item(ns).`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível ler a planilha. Exporte o modelo e use o mesmo formato.");
    } finally {
      setFormImporting(false);
      if (formFileRef.current) formFileRef.current.value = "";
    }
  };

  const categories = useMemo(
    () => [...new Set(materials.map((m) => m.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [materials],
  );

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "previous" || key === "counted" || key === "diff" ? "desc" : "asc");
    }
  };

  const hiddenCount = hiddenKeys.size;
  const effectiveShowHidden = showHidden && hiddenCount > 0;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = [...skus]
      .filter((sku) => (category ? sku.category === category : true))
      .filter((sku) => {
        if (!locationFilter) return true;
        if (locationFilter === "__none__") return !sku.locationId;
        return sku.locationId === locationFilter;
      })
      .filter((sku) => {
        if (!term) return true;
        const location = sku.locationId ? locationName.get(sku.locationId) ?? "" : "";
        return (
          sku.label.toLowerCase().includes(term) ||
          sku.category.toLowerCase().includes(term) ||
          sku.variant.toLowerCase().includes(term) ||
          location.toLowerCase().includes(term)
        );
      })
      .filter((sku) => {
        const hidden = hiddenKeys.has(stockKey(sku.materialId, sku.variant));
        return effectiveShowHidden ? hidden : !hidden;
      })
      .filter((sku) => {
        if (!diffFilter) return true;
        const key = stockKey(sku.materialId, sku.variant);
        const diff = (counts[key] ?? 0) - previousOf(sku.materialId, sku.variant);
        if (diffFilter === "changed") return diff !== 0;
        if (diffFilter === "same") return diff === 0;
        return true;
      });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const locA = a.locationId ? locationName.get(a.locationId) ?? "" : "";
      const locB = b.locationId ? locationName.get(b.locationId) ?? "" : "";
      const prevA = previousOf(a.materialId, a.variant);
      const prevB = previousOf(b.materialId, b.variant);
      const countA = counts[stockKey(a.materialId, a.variant)] ?? 0;
      const countB = counts[stockKey(b.materialId, b.variant)] ?? 0;
      let cmp = 0;
      if (sortKey === "name") cmp = a.label.localeCompare(b.label, "pt-BR");
      else if (sortKey === "category") {
        cmp = a.category.localeCompare(b.category, "pt-BR") || a.label.localeCompare(b.label, "pt-BR");
      } else if (sortKey === "location") cmp = locA.localeCompare(locB, "pt-BR") || a.label.localeCompare(b.label, "pt-BR");
      else if (sortKey === "previous") cmp = prevA - prevB;
      else if (sortKey === "counted") cmp = countA - countB;
      else cmp = countA - prevA - (countB - prevB);
      return cmp * dir;
    });
    return list;
  }, [
    skus,
    category,
    locationFilter,
    locationName,
    search,
    diffFilter,
    counts,
    sortKey,
    sortDir,
    previousOf,
    hiddenKeys,
    effectiveShowHidden,
  ]);

  const toCount = skus.length - hiddenCount;
  const changedCount = skus.filter((sku) => {
    const key = stockKey(sku.materialId, sku.variant);
    if (hiddenKeys.has(key)) return false;
    return (counts[key] ?? 0) !== previousOf(sku.materialId, sku.variant);
  }).length;

  const toggleHidden = (key: string, hide: boolean) => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (hide) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const hideListed = () => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      for (const sku of visible) next.add(stockKey(sku.materialId, sku.variant));
      return next;
    });
  };

  const unhideListed = () => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      for (const sku of visible) next.delete(stockKey(sku.materialId, sku.variant));
      return next;
    });
    if (visible.length >= hiddenCount) setShowHidden(false);
  };

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
    const countedSkus = skus.filter((sku) => !hiddenKeys.has(stockKey(sku.materialId, sku.variant)));
    const skippedSkus = skus.filter((sku) => hiddenKeys.has(stockKey(sku.materialId, sku.variant)));
    onConclude({
      id: initial?.id ?? uid(),
      date,
      responsible: responsible.trim(),
      participants,
      note: note.trim(),
      items: countedSkus.map((sku) => ({
        materialId: sku.materialId,
        variant: sku.variant,
        previous: previousOf(sku.materialId, sku.variant),
        counted: counts[stockKey(sku.materialId, sku.variant)] ?? 0,
      })),
      skipped: skippedSkus.map((sku) => ({
        materialId: sku.materialId,
        variant: sku.variant,
      })),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <PageShell
      title={isEditing ? "Editar inventário" : "Novo inventário"}
      back={
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm text-forest/60 hover:text-forest"
        >
          <ArrowLeft className="size-4" />
          Voltar ao histórico
        </button>
      }
      description={
        isEditing
          ? "Altere quantidades ou quem participou. Ocultos não mudam o estoque."
          : fromSheet
            ? "Revise as quantidades. O que não veio na planilha fica oculto."
            : "Preencha a data e a contagem. Oculte o que não entra desta vez."
      }
    >
      <input
        ref={formFileRef}
        type="file"
        accept=".xlsx,.xlsm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importIntoForm(file);
        }}
      />
      <Card as="div" className="grid gap-3 sm:grid-cols-2">
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
                <li key={name}>
                  <ChipRow>
                    <span className="min-w-0 break-words">{name}</span>
                    <button
                      type="button"
                      aria-label={`Remover ${name}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-forest/40 hover:text-danger"
                      onClick={() => setParticipants((current) => current.filter((item) => item !== name))}
                    >
                      <X className="size-3" />
                    </button>
                  </ChipRow>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Field label="Observação" className="sm:col-span-2">
          <input className={fieldControlClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Card>

      <CatalogFilters
        compact
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar…"
        facets={[
          {
            id: "category",
            label: "Categoria",
            value: category,
            onChange: setCategory,
            options: categories.map((item) => ({ value: item, label: item })),
          },
          {
            id: "location",
            label: "Local",
            value: locationFilter,
            onChange: setLocationFilter,
            options: [
              { value: "__none__", label: "Sem local" },
              ...locations.map((item) => ({ value: item.id, label: item.name })),
            ],
          },
          {
            id: "diff",
            label: "Diferença",
            value: diffFilter,
            onChange: setDiffFilter,
            options: [
              { value: "changed", label: "Com diferença" },
              { value: "same", label: "Iguais ao saldo" },
            ],
          },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="meta-text tabular">
          {effectiveShowHidden
            ? `${visible.length} oculto(s) listado(s)`
            : visible.length === toCount
              ? `${toCount} a contar`
              : `${visible.length} de ${toCount} a contar`}
          {hiddenCount > 0 && !effectiveShowHidden ? ` · ${hiddenCount} oculto(s)` : ""}
          {!effectiveShowHidden
            ? changedCount > 0
              ? ` · ${changedCount} com diferença`
              : " · sem diferenças até agora"
            : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hiddenCount > 0 ? (
            <SegmentedControl
              ariaLabel="Itens da contagem"
              value={effectiveShowHidden ? "hidden" : "count"}
              onChange={(value) => setShowHidden(value === "hidden")}
              options={[
                { value: "count", label: "Contagem" },
                { value: "hidden", label: `${hiddenCount} ocultos` },
              ]}
            />
          ) : null}
          {visible.length > 0 ? (
            <Button
              variant="outline"
              className="h-10 px-4"
              onClick={effectiveShowHidden ? unhideListed : hideListed}
            >
              {effectiveShowHidden ? <Eye data-icon="inline-start" /> : <EyeOff data-icon="inline-start" />}
              {effectiveShowHidden ? "Incluir listados" : "Ocultar listados"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={() => formFileRef.current?.click()}
            disabled={formImporting}
          >
            <Upload data-icon="inline-start" />
            {formImporting ? "Importando…" : "Importar"}
          </Button>
          <Button className="h-10 px-5" onClick={conclude}>
            <ClipboardCheck data-icon="inline-start" />
            {isEditing ? "Salvar alterações" : "Concluir inventário"}
          </Button>
        </div>
      </div>

      {skus.some((sku) => sku.label.endsWith("Não classificado")) ? (
        <p className="rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
          Há saldo sem variação. Conte cada variação e zere “Não classificado”.
        </p>
      ) : null}

      <Card flush>
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <SortTh
                label="Material / variação"
                active={sortKey === "name"}
                dir={sortDir}
                onClick={() => toggleSort("name")}
                className="pl-4 sm:pl-5"
              />
              <SortTh
                label="Categoria"
                active={sortKey === "category"}
                dir={sortDir}
                onClick={() => toggleSort("category")}
                className="hidden px-3 md:table-cell"
              />
              <SortTh
                label="Local"
                active={sortKey === "location"}
                dir={sortDir}
                onClick={() => toggleSort("location")}
                className="hidden px-3 md:table-cell"
              />
              <SortTh
                label={initial ? "Saldo anterior" : "Saldo atual"}
                align="right"
                active={sortKey === "previous"}
                dir={sortDir}
                onClick={() => toggleSort("previous")}
                className="px-3"
              />
              <SortTh
                label="Contagem"
                align="right"
                active={sortKey === "counted"}
                dir={sortDir}
                onClick={() => toggleSort("counted")}
                className="w-24 px-2"
              />
              <SortTh
                label="Diferença"
                align="right"
                active={sortKey === "diff"}
                dir={sortDir}
                onClick={() => toggleSort("diff")}
                className="px-3"
              />
              <th className="field-label py-3 pr-4 text-right font-normal">
                <span className="sr-only">Ocultar da contagem</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="meta-text px-5 py-10 text-center">
                  {effectiveShowHidden
                    ? hiddenCount === 0
                      ? "Nenhum item oculto. Tudo entra nesta contagem."
                      : "Nenhum item oculto com esses filtros."
                    : toCount === 0
                      ? "Todos os itens estão ocultos. Mostre os ocultos para incluí-los de novo."
                      : "Nenhum item com esses filtros."}
                </td>
              </tr>
            ) : (
              visible.map((sku) => {
              const key = stockKey(sku.materialId, sku.variant);
              const previous = previousOf(sku.materialId, sku.variant);
              const counted = counts[key] ?? 0;
              const diff = counted - previous;
              const hidden = hiddenKeys.has(key);
              return (
                <tr
                  key={key}
                  className={cn(
                    "border-b border-line last:border-0",
                    hidden && "bg-forest/[0.02]",
                  )}
                >
                  <td className="py-2.5 pl-4 sm:pl-5">
                    <p className={cn("font-medium text-forest", hidden && "text-forest/50")}>
                      {sku.label}
                    </p>
                    <p className="meta-text">
                      {sku.unit}
                      <span className="md:hidden">
                        {sku.unit ? " · " : ""}
                        {sku.category}
                      </span>
                    </p>
                  </td>
                  <td className="hidden px-3 py-2.5 text-forest/60 md:table-cell">{sku.category}</td>
                  <td className="hidden px-3 py-2.5 text-forest/60 md:table-cell">
                    {sku.locationId ? locationName.get(sku.locationId) ?? "—" : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-forest/60 tabular">{formatInt(previous)}</td>
                  <td className="px-2 py-2.5 text-right">
                    <QtyInput
                      ariaLabel={`Contagem de ${sku.label}`}
                      disabled={hidden}
                      edited={!hidden && diff !== 0}
                      value={counted}
                      onChange={(value) => setCounts((current) => ({ ...current, [key]: value }))}
                    />
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right font-medium tabular",
                      hidden
                        ? "text-forest/30"
                        : diff === 0
                          ? "text-forest/40"
                          : diff > 0
                            ? "text-forest"
                            : "text-danger",
                    )}
                  >
                    {hidden ? "—" : `${diff > 0 ? "+" : ""}${formatInt(diff)}`}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-forest/45 hover:text-forest"
                      aria-label={hidden ? `Incluir ${sku.label} na contagem` : `Ocultar ${sku.label} da contagem`}
                      onClick={() => toggleHidden(key, !hidden)}
                    >
                      {hidden ? <Eye /> : <EyeOff />}
                    </Button>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </PageShell>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
  align,
  className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "right";
  className?: string;
}) {
  return (
    <th className={cn("field-label py-3 font-normal", align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-forest",
          active ? "text-forest" : "text-forest/55",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : null}
      </button>
    </th>
  );
}
