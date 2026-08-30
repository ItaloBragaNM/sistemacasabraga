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
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import type { InsumoRecord } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function InsumosAdmin() {
  const { data, ready, upsertInsumo, removeInsumo, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState<InsumoRecord | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const list = [...data.insumos].sort(
      (a, b) =>
        a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
    );
    return list.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term)
      );
    });
  }, [data, search, categoryFilter]);

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
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        title="Insumos"
        description="Base da cozinha. Os insumos alimentam as fichas técnicas dos pratos (em breve)."
        action={
          <div className="flex flex-wrap gap-2">
            <ImportExport entity="insumos" />
            <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
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
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo insumo
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="w-10 py-3 pl-5">
                      <ItemCheckbox
                        label="Selecionar todos"
                        checked={selection.allVisibleSelected}
                        indeterminate={selection.someVisibleSelected}
                        onChange={selection.toggleAllVisible}
                      />
                    </th>
                    <th className="field-label py-3 font-normal">Insumo</th>
                    <th className="field-label py-3 font-normal">Categoria</th>
                    <th className="field-label py-3 text-center font-normal">Unid.</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5">
                        <ItemCheckbox
                          label={`Selecionar ${item.name}`}
                          checked={selection.selected.has(item.id)}
                          onChange={() => selection.toggle(item.id)}
                        />
                      </td>
                      <td className="py-3 font-list font-medium text-forest">{item.name}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-forest/6 px-2.5 py-1 text-xs text-forest/70">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 text-center text-forest/70">{item.unit || "—"}</td>
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
            </div>
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
    </div>
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
          <select className={fieldControlClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unidade">
          <input
            className={fieldControlClass}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg, g, L, un…"
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
      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar insumo"}
        </Button>
      </div>
    </div>
  );
}
