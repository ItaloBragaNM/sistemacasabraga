"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import {
  BulkBar,
  confirmBulkDelete,
  ItemCheckbox,
  RecordRowActions,
  useItemSelection,
} from "@/components/cadastros/bulk";
import { ImportExport } from "@/components/cadastros/import-export";
import { CadastrosHeader, CatalogFilters, Chip, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { SortableTh, compareSort, useColumnSort } from "@/components/cadastros/sort-header";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import type { InsumoRecord } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function InsumosAdmin() {
  const { data, ready, upsertInsumo, removeInsumo, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<InsumoRecord | null>(null);
  const [open, setOpen] = useState(false);
  const sort = useColumnSort<"name" | "category" | "unit" | "cost">("category");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const list = [...data.insumos].sort((a, b) => {
      const value = {
        name: a.name,
        category: a.category,
        unit: a.unit || "",
        cost: a.unitCost || 0,
      }[sort.key];
      const other = {
        name: b.name,
        category: b.category,
        unit: b.unit || "",
        cost: b.unitCost || 0,
      }[sort.key];
      return compareSort(value, other, sort.dir) || a.name.localeCompare(b.name, "pt-BR");
    });
    return list.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)
      );
    });
  }, [data, search, categoryFilter, sort.key, sort.dir]);

  const selection = useItemSelection(filtered.map((item) => item.id));

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const duplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    duplicateMany("insumos", ids);
    toast.success(ids.length === 1 ? "Insumo duplicado." : `${ids.length} insumos duplicados.`);
    selection.clear();
  };

  const removeSelected = () => {
    if (!confirmBulkDelete(selection.selectedVisible.length)) return;
    removeMany("insumos", selection.selectedVisible);
    toast.success("Insumos excluídos.");
    selection.clear();
  };

  return (
    <PageShell>
      <CadastrosHeader
        title="Insumos"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ImportExport entity="insumos" />
            <Button className="h-10 px-5" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo insumo
            </Button>
          </div>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastros indisponíveis" description="Recarregue a página." />
      ) : (
        <>
          <CatalogFilters
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar insumo…"
            facets={[
              {
                id: "category",
                label: "Categoria",
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: data.insumoCategories.map((category) => ({
                  value: category,
                  label: category,
                })),
              },
            ]}
          />
          <BulkBar
            count={selection.selectedVisible.length}
            noun="insumo"
            onDuplicate={() => duplicate(selection.selectedVisible)}
            onDelete={removeSelected}
            onClear={selection.clear}
          />
          {filtered.length === 0 ? (
            <EmptyBlock
              title="Nenhum insumo"
              description="Cadastre os insumos da cozinha ou importe de uma planilha."
              action={
                <Button className="h-10" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo insumo
                </Button>
              }
            />
          ) : (
            <Card flush className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="w-10 py-3 pl-5 pr-3">
                      <ItemCheckbox
                        label="Selecionar todos"
                        checked={selection.allVisibleSelected}
                        indeterminate={selection.someVisibleSelected}
                        onChange={selection.toggleAllVisible}
                      />
                    </th>
                    <SortableTh label="Insumo" active={sort.key === "name"} dir={sort.dir} onClick={() => sort.toggle("name")} />
                    <SortableTh label="Categoria" active={sort.key === "category"} dir={sort.dir} onClick={() => sort.toggle("category")} />
                    <SortableTh label="Unidade" active={sort.key === "unit"} dir={sort.dir} onClick={() => sort.toggle("unit")} align="center" />
                    <SortableTh label="Custo" active={sort.key === "cost"} dir={sort.dir} onClick={() => sort.toggle("cost")} align="right" />
                    <th className="field-label py-3 pr-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-line last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5 pr-3">
                        <ItemCheckbox
                          label={`Selecionar ${item.name}`}
                          checked={selection.selected.has(item.id)}
                          onChange={() => selection.toggle(item.id)}
                        />
                      </td>
                      <td className="py-3 pr-3 font-medium text-forest">
                        {item.name}
                        {item.brand ? (
                          <span className="meta-text block font-normal">{item.brand}</span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <Chip className="bg-forest/6 text-forest/70">{item.category}</Chip>
                      </td>
                      <td className="py-3 pr-3 text-center text-forest/70">{item.unit || "—"}</td>
                      <td className="py-3 pr-3 text-right text-forest/70 tabular">
                        {item.unitCost ? item.unitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                      </td>
                      <td className="py-3 pr-5">
                        <RecordRowActions
                          label={item.name}
                          onEdit={() => {
                            setEditing(item);
                            setOpen(true);
                          }}
                          onDuplicate={() => duplicate([item.id])}
                          onDelete={() => {
                            if (window.confirm(`Excluir "${item.name}"?`)) {
                              removeInsumo(item.id);
                              toast.success("Insumo excluído.");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {data ? (
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar insumo" : "Novo insumo"}>
          <InsumoForm
            key={editing?.id ?? "new"}
            initial={editing}
            categories={data.insumoCategories}
            onCancel={() => setOpen(false)}
            onSubmit={(insumo) => {
              upsertInsumo(insumo);
              toast.success(editing ? "Insumo atualizado." : "Insumo cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}

function InsumoForm({
  initial,
  categories,
  onSubmit,
  onCancel,
}: {
  initial: InsumoRecord | null;
  categories: string[];
  onSubmit: (insumo: InsumoRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "Outros");
  const [unit, setUnit] = useState(initial?.unit ?? "kg");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [unitCost, setUnitCost] = useState(String(initial?.unitCost || ""));
  const [yieldPercent, setYieldPercent] = useState(String(initial?.yieldPercent || 100));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do insumo.");
      return;
    }
    const stamp = new Date().toISOString();
    onSubmit({
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      unit: unit.trim(),
      brand: brand.trim(),
      unitCost: Number(unitCost.replace(",", ".")) || 0,
      yieldPercent: Number(yieldPercent.replace(",", ".")) || 100,
      notes: notes.trim(),
      createdAt: initial?.createdAt ?? stamp,
      updatedAt: stamp,
    });
  };

  return (
    <div className="space-y-5">
      <Field label="Nome do insumo">
        <input
          className={fieldControlClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Camarão limpo"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria">
          <SearchableSelect
            value={category}
            onChange={setCategory}
            searchPlaceholder="Pesquisar categoria…"
            options={categories.map((item) => ({ value: item, label: item }))}
          />
        </Field>
        <Field label="Unidade">
          <input
            className={fieldControlClass}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg, g, L, un…"
          />
        </Field>
        <Field label="Marca">
          <input className={fieldControlClass} value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Custo unitário">
          <input
            className={fieldControlClass}
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0,00"
          />
        </Field>
        <Field label="% de aproveitamento">
          <input
            className={fieldControlClass}
            value={yieldPercent}
            onChange={(e) => setYieldPercent(e.target.value)}
            placeholder="100"
          />
        </Field>
      </div>
      <Field label="Observações">
        <textarea
          className={cn(fieldControlClass, "min-h-20 py-2")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 px-5" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar insumo"}
        </Button>
      </div>
    </div>
  );
}
