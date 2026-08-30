"use client";

import { Plus, UtensilsCrossed } from "lucide-react";
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
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import type { DishRecord } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function CardapioAdmin() {
  const { data, ready, upsertDish, removeDish, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [materialsFilter, setMaterialsFilter] = useState("");
  const [editing, setEditing] = useState<DishRecord | null>(null);
  const [open, setOpen] = useState(false);

  const materialName = useMemo(
    () => new Map((data?.materials ?? []).map((material) => [material.id, material.name])),
    [data],
  );

  const groups = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const dishes = data.dishes.filter((dish) => {
      if (categoryFilter && dish.category !== categoryFilter) return false;
      if (materialsFilter === "none" && dish.materialIds.length > 0) return false;
      if (term && !dish.name.toLowerCase().includes(term)) return false;
      return true;
    });
    const order = data.dishCategories;
    const extras = [
      ...new Set(
        dishes.map((dish) => dish.category).filter((category) => !order.includes(category)),
      ),
    ];
    return [...order, ...extras]
      .map((category) => ({
        category,
        dishes: dishes
          .filter((dish) => dish.category === category)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      }))
      .filter((group) => group.dishes.length > 0);
  }, [data, search, categoryFilter, materialsFilter]);

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (dish: DishRecord) => {
    setEditing(dish);
    setOpen(true);
  };

  const visibleIds = groups.flatMap((group) => group.dishes.map((dish) => dish.id));
  const selection = useItemSelection(visibleIds);

  const duplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    duplicateMany("dishes", ids);
    toast.success(ids.length === 1 ? "Prato duplicado." : `${ids.length} pratos duplicados.`);
    selection.clear();
  };

  const removeSelected = () => {
    if (!confirmBulkDelete(selection.selectedVisible.length)) return;
    removeMany("dishes", selection.selectedVisible);
    toast.success("Pratos excluídos.");
    selection.clear();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        title="Cardápio"
        description="Catálogo de pratos do buffet. Cada prato reúne os materiais (logística) usados no serviço — e, futuramente, sua ficha técnica de insumos."
        action={
          <div className="flex flex-wrap gap-2">
            <ImportExport entity="dishes" />
            <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo prato
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <CatalogFilters
                search={search}
                onSearch={setSearch}
                searchPlaceholder="Buscar prato…"
                facets={[
                  {
                    id: "category",
                    label: "Categoria",
                    value: categoryFilter,
                    onChange: setCategoryFilter,
                    options: data.dishCategories.map((category) => ({
                      value: category,
                      label: category,
                    })),
                  },
                  {
                    id: "materials",
                    label: "Materiais",
                    value: materialsFilter,
                    onChange: setMaterialsFilter,
                    options: [{ value: "none", label: "Sem materiais vinculados" }],
                  },
                ]}
              />
            </div>
            {groups.length > 0 ? (
              <label className="flex items-center gap-2 text-sm font-light text-forest/60">
                <ItemCheckbox
                  label="Selecionar todos"
                  checked={selection.allVisibleSelected}
                  indeterminate={selection.someVisibleSelected}
                  onChange={selection.toggleAllVisible}
                />
                Selecionar todos
              </label>
            ) : null}
          </div>
          <BulkBar
            count={selection.selectedVisible.length}
            noun="prato"
            onDuplicate={() => duplicate(selection.selectedVisible)}
            onDelete={removeSelected}
            onClear={selection.clear}
          />

          {groups.length === 0 ? (
            <EmptyBlock
              title="Nenhum prato"
              description="Cadastre os pratos do buffet e vincule os materiais usados no serviço."
              action={
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo prato
                </Button>
              }
            />
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.category}>
                  <h2 className="font-section mb-3 text-[0.72rem] text-forest/70">
                    {group.category}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.dishes.map((dish) => (
                      <div
                        key={dish.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-forest/10 bg-white p-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <ItemCheckbox
                            label={`Selecionar ${dish.name}`}
                            checked={selection.selected.has(dish.id)}
                            onChange={() => selection.toggle(dish.id)}
                          />
                          <div className="min-w-0">
                            <p className="font-list font-medium text-forest">{dish.name}</p>
                            <p className="mt-1 text-xs font-light text-forest/55">
                              {dish.materialIds.length > 0
                                ? dish.materialIds
                                    .map((id) => materialName.get(id))
                                    .filter(Boolean)
                                    .join(", ")
                                : "Sem materiais vinculados"}
                            </p>
                          </div>
                        </div>
                        <RecordRowActions
                          label={dish.name}
                          onEdit={() => startEdit(dish)}
                          onDuplicate={() => duplicate([dish.id])}
                          onDelete={() => {
                            if (window.confirm(`Excluir "${dish.name}"?`)) {
                              removeDish(dish.id);
                              toast.success("Prato excluído.");
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {data ? (
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar prato" : "Novo prato"} wide>
          <DishForm
            key={editing?.id ?? "new"}
            initial={editing}
            materials={data.materials}
            categories={data.dishCategories}
            onCancel={() => setOpen(false)}
            onSubmit={(dish) => {
              upsertDish(dish);
              toast.success(editing ? "Prato atualizado." : "Prato cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function DishForm({
  initial,
  materials,
  categories,
  onSubmit,
  onCancel,
}: {
  initial: DishRecord | null;
  materials: import("@/lib/cadastros/types").MaterialRecord[];
  categories: string[];
  onSubmit: (dish: DishRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "Menu");
  const [materialIds, setMaterialIds] = useState<string[]>(initial?.materialIds ?? []);
  const [materialSearch, setMaterialSearch] = useState("");

  const filteredMaterials = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    const list = [...materials].sort(
      (a, b) =>
        a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
    );
    if (!term) return list;
    return list.filter(
      (material) =>
        material.name.toLowerCase().includes(term) ||
        material.category.toLowerCase().includes(term),
    );
  }, [materials, materialSearch]);

  const toggle = (id: string) => {
    setMaterialIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do prato.");
      return;
    }
    const now = new Date().toISOString();
    onSubmit({
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      materialIds,
      insumoIds: initial?.insumoIds ?? [],
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do prato" className="sm:col-span-2">
          <input
            className={fieldControlClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Risoto de Camarão"
          />
        </Field>
        <Field label="Categoria">
          <select
            className={fieldControlClass}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="field-label">Materiais vinculados</p>
          <span className="text-xs font-light text-forest/45">
            {materialIds.length} selecionado(s)
          </span>
        </div>
        <div className="mb-2">
          <SearchInput
            value={materialSearch}
            onChange={setMaterialSearch}
            placeholder="Buscar material…"
          />
        </div>
        {materials.length === 0 ? (
          <p className="rounded-lg border border-dashed border-forest/20 p-4 text-sm font-light text-forest/50">
            Cadastre materiais primeiro para vinculá-los aos pratos.
          </p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-forest/10 p-2">
            {filteredMaterials.map((material) => {
              const checked = materialIds.includes(material.id);
              return (
                <label
                  key={material.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    checked ? "bg-forest/8" : "hover:bg-forest/[0.03]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      checked={checked}
                      onChange={() => toggle(material.id)}
                    />
                    <span className="font-list text-forest">{material.name}</span>
                  </span>
                  <span className="text-xs font-light text-forest/45">{material.category}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-forest/10 bg-forest/[0.02] p-3 text-xs font-light text-forest/55">
        <UtensilsCrossed className="size-4 text-forest/40" />
        Insumos (cozinha) serão vinculados quando o Cadastro de Insumos entrar no ar.
      </div>

      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar prato"}
        </Button>
      </div>
    </div>
  );
}
