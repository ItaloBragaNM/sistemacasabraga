"use client";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
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
import { CadastrosHeader, CatalogFilters, Chip, ChipRow, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { SortableTh } from "@/components/cadastros/sort-header";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { QtyInput } from "@/components/ui/qty-input";
import { basesMap, describeProportion } from "@/lib/cadastros/calc";
import { MAX_FACTORS, MATERIAL_KIND_LABELS, MATERIAL_KINDS, type MaterialKind, type MaterialRecord, type ProportionFactor } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { compressImageToDataUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

type MaterialSortKey = "photo" | "name" | "kind" | "proportion" | "category" | "unit";

export function MateriaisAdmin() {
  const { data, ready, upsertMaterial, removeMaterial, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [proportionFilter, setProportionFilter] = useState("");
  const [sortKey, setSortKey] = useState<MaterialSortKey>("category");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<MaterialRecord | null>(null);
  const [open, setOpen] = useState(false);

  const bases = useMemo(() => (data ? basesMap(data) : new Map()), [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const direction = sortDir === "asc" ? 1 : -1;
    const list = [...data.materials].sort((a, b) => {
      let compared = 0;
      if (sortKey === "photo") compared = Number(Boolean(a.photoDataUrl)) - Number(Boolean(b.photoDataUrl));
      else if (sortKey === "name") compared = a.name.localeCompare(b.name, "pt-BR");
      else if (sortKey === "kind") {
        compared = MATERIAL_KIND_LABELS[a.kind].localeCompare(MATERIAL_KIND_LABELS[b.kind], "pt-BR");
      } else if (sortKey === "proportion") {
        compared = describeProportion(a, bases).localeCompare(describeProportion(b, bases), "pt-BR");
      } else if (sortKey === "unit") compared = (a.unit || "").localeCompare(b.unit || "", "pt-BR");
      else compared = a.category.localeCompare(b.category, "pt-BR");
      return compared * direction || a.name.localeCompare(b.name, "pt-BR");
    });
    return list.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (kindFilter && item.kind !== kindFilter) return false;
      if (proportionFilter === "missing" && item.factors.length > 0) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.variants.some((variant) => variant.toLowerCase().includes(term)) ||
        MATERIAL_KIND_LABELS[item.kind].toLowerCase().includes(term)
      );
    });
  }, [data, bases, search, categoryFilter, kindFilter, proportionFilter, sortKey, sortDir]);

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (material: MaterialRecord) => {
    setEditing(material);
    setOpen(true);
  };

  const selection = useItemSelection(filtered.map((item) => item.id));

  const toggleSort = (key: MaterialSortKey) => {
    if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const duplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    duplicateMany("materials", ids);
    toast.success(ids.length === 1 ? "Material duplicado." : `${ids.length} materiais duplicados.`);
    selection.clear();
  };

  const removeSelected = () => {
    if (!confirmBulkDelete(selection.selectedVisible.length)) return;
    removeMany("materials", selection.selectedVisible);
    toast.success("Materiais excluídos.");
    selection.clear();
  };

  return (
    <PageShell>
      <CadastrosHeader
        title="Materiais"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ImportExport entity="materials" />
            <Button className="h-10 px-5" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo material
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
            searchPlaceholder="Buscar material…"
            facets={[
              {
                id: "category",
                label: "Categoria",
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: data.materialCategories.map((category) => ({
                  value: category,
                  label: category,
                })),
              },
              {
                id: "kind",
                label: "Tipo",
                value: kindFilter,
                onChange: setKindFilter,
                options: MATERIAL_KINDS.map((kind) => ({
                  value: kind,
                  label: MATERIAL_KIND_LABELS[kind],
                })),
              },
            ]}
            extra={
              <FilterChip
                active={proportionFilter === "missing"}
                onClick={() => setProportionFilter((current) => (current === "missing" ? "" : "missing"))}
                className="h-10 shrink-0"
              >
                Sem proporção
              </FilterChip>
            }
          />
          <BulkBar
            count={selection.selectedVisible.length}
            noun="material"
            onDuplicate={() => duplicate(selection.selectedVisible)}
            onDelete={removeSelected}
            onClear={selection.clear}
          />
          {filtered.length === 0 ? (
            <EmptyBlock
              title="Nenhum material"
              description="Cadastre os materiais da casa para alimentar a separação por evento."
              action={
                <Button className="h-10" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo material
                </Button>
              }
            />
          ) : (
            <Card flush className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
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
                    <SortableTh label="Foto" active={sortKey === "photo"} dir={sortDir} onClick={() => toggleSort("photo")} className="w-14" />
                    <SortableTh label="Material" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                    <SortableTh label="Tipo" active={sortKey === "kind"} dir={sortDir} onClick={() => toggleSort("kind")} />
                    <SortableTh label="Proporção" active={sortKey === "proportion"} dir={sortDir} onClick={() => toggleSort("proportion")} />
                    <SortableTh label="Categoria" active={sortKey === "category"} dir={sortDir} onClick={() => toggleSort("category")} />
                    <SortableTh label="Unid." active={sortKey === "unit"} dir={sortDir} onClick={() => toggleSort("unit")} align="center" />
                    <th className="field-label py-3 pr-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((material) => (
                    <tr
                      key={material.id}
                      className="border-b border-line last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5 pr-3">
                        <ItemCheckbox
                          label={`Selecionar ${material.name}`}
                          checked={selection.selected.has(material.id)}
                          onChange={() => selection.toggle(material.id)}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        {material.photoDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={material.photoDataUrl}
                            alt=""
                            className="size-10 rounded-md object-cover ring-1 ring-line"
                          />
                        ) : (
                          <span className="flex size-10 items-center justify-center rounded-md bg-forest/[0.04] text-forest/25">
                            <ImagePlus className="size-4" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-forest">{material.name}</p>
                        {material.variants.length > 0 ? (
                          <p className="meta-text mt-0.5">
                            {material.variants.join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        <Chip
                          className={cn(
                            material.kind === "descartavel"
                              ? "border border-line bg-white text-forest/70"
                              : material.kind === "misto"
                                ? "bg-forest/8 text-forest/70"
                                : "bg-petrol/10 text-petrol",
                          )}
                        >
                          {MATERIAL_KIND_LABELS[material.kind]}
                        </Chip>
                      </td>
                      <td className="py-3 pr-3 text-[13px] text-forest/60">
                        {material.factors.length === 0 ? (
                          <Chip className="bg-danger/10 text-danger">
                            Sem proporção cadastrada
                          </Chip>
                        ) : (
                          describeProportion(material, bases)
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Chip className="bg-forest/6 text-forest/70">{material.category}</Chip>
                      </td>
                      <td className="py-3 pr-3 text-center text-forest/70">{material.unit || "—"}</td>
                      <td className="py-3 pr-5">
                        <RecordRowActions
                          label={material.name}
                          onEdit={() => startEdit(material)}
                          onDuplicate={() => duplicate([material.id])}
                          onDelete={() => {
                            if (window.confirm(`Excluir "${material.name}"?`)) {
                              removeMaterial(material.id);
                              toast.success("Material excluído.");
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
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? "Editar material" : "Novo material"}
          wide
        >
          <MaterialForm
            key={editing?.id ?? "new"}
            initial={editing}
            categories={data.materialCategories}
            bases={data.bases}
            locations={data.stockLocations ?? []}
            onCancel={() => setOpen(false)}
            onSubmit={(material) => {
              upsertMaterial(material);
              toast.success(editing ? "Material atualizado." : "Material cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}

function MaterialForm({
  initial,
  categories,
  bases,
  locations,
  onSubmit,
  onCancel,
}: {
  initial: MaterialRecord | null;
  categories: string[];
  bases: import("@/lib/cadastros/types").CalcBase[];
  locations: { id: string; name: string }[];
  onSubmit: (material: MaterialRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "Outros");
  const [unit, setUnit] = useState(initial?.unit ?? "un");
  const [kind, setKind] = useState<MaterialKind>(initial?.kind ?? "permanente");
  const [variants, setVariants] = useState<string[]>(initial?.variants ?? []);
  const [newVariant, setNewVariant] = useState("");
  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [factors, setFactors] = useState<ProportionFactor[]>(initial?.factors ?? []);
  const [photoDataUrl, setPhotoDataUrl] = useState(initial?.photoDataUrl ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const basesById = useMemo(() => new Map(bases.map((base) => [base.id, base])), [bases]);

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do material.");
      return;
    }
    if (factors.some((factor) => !factor.baseId)) {
      toast.error("Cada fator precisa de uma base de cálculo.");
      return;
    }
    const now = new Date().toISOString();
    onSubmit({
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      unit: unit.trim(),
      kind,
      variants,
      factors: factors.map((factor) => ({ baseId: factor.baseId, mult: factor.mult || 0 })),
      locationId: locationId || undefined,
      photoDataUrl: photoDataUrl || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  };

  const addVariant = () => {
    const value = newVariant.trim();
    if (!value) return;
    if (variants.some((item) => item.toLowerCase() === value.toLowerCase())) {
      toast.error("Essa variante já está na lista.");
      return;
    }
    setVariants([...variants, value]);
    setNewVariant("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do material" className="sm:col-span-2">
          <input
            className={fieldControlClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Prato Raso"
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
        <Field label="Unidade">
          <input
            className={fieldControlClass}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="un, sachê, kg…"
          />
        </Field>
        <Field label="Local do estoque">
          <select
            className={fieldControlClass}
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            <option value="">Sem local definido</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo (estoque)" className="sm:col-span-2">
          <select
            className={fieldControlClass}
            value={kind}
            onChange={(event) => setKind(event.target.value as MaterialKind)}
          >
            {MATERIAL_KINDS.map((item) => (
              <option key={item} value={item}>
                {MATERIAL_KIND_LABELS[item]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="meta-text -mt-2">
        Permanente volta do evento. Descartável consome-se. Misto é para kits que misturam os dois.
      </p>

      <div>
        <p className="field-label mb-2">Foto do material</p>
        <div className="flex items-center gap-4">
          {photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoDataUrl}
              alt={name || "Material"}
              className="size-20 rounded-lg object-cover ring-1 ring-line"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-lg bg-forest/[0.04] text-forest/25">
              <ImagePlus className="size-6" />
            </span>
          )}
          <div className="space-y-2">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-forest/15 px-4 text-sm text-forest/80 hover:border-forest/30">
              {photoBusy ? "Compactando…" : photoDataUrl ? "Trocar foto" : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={photoBusy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    setPhotoBusy(true);
                    setPhotoDataUrl(await compressImageToDataUrl(file));
                  } catch (error) {
                    console.error(error);
                    toast.error(
                      error instanceof Error && error.message === "too-large"
                        ? "A foto ficou grande demais. Use outra imagem."
                        : "Não foi possível ler a foto.",
                    );
                  } finally {
                    setPhotoBusy(false);
                  }
                }}
              />
            </label>
            {photoDataUrl ? (
              <button
                type="button"
                className="meta-text block hover:text-danger"
                onClick={() => setPhotoDataUrl("")}
              >
                Remover foto
              </button>
            ) : (
              <p className="meta-text">JPEG compactado, só para identificação.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="field-label mb-2">Variantes (marca, tipo, cor, tamanho)</p>
        <p className="meta-text mb-2">
          Cada variação é um item no inventário. O estoque mostra a quantidade de cada uma e o total do material.
        </p>
        {variants.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {variants.map((variant) => (
              <ChipRow key={variant}>
                <span className="min-w-0 break-words">{variant}</span>
                <button
                  type="button"
                  aria-label={`Remover ${variant}`}
                  onClick={() => setVariants(variants.filter((item) => item !== variant))}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-forest/40 hover:text-danger"
                >
                  <Trash2 className="size-3" />
                </button>
              </ChipRow>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            className={cn(fieldControlClass, "min-w-0 flex-1 sm:max-w-xs")}
            value={newVariant}
            onChange={(event) => setNewVariant(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addVariant())}
            placeholder="Ex.: Wolff Laço, Prata Oval, Indução…"
          />
          <Button type="button" variant="outline" className="h-10 px-4" onClick={addVariant}>
            <Plus data-icon="inline-start" />
            Adicionar
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="field-label">Proporção (base × multiplicador)</p>
          <span className="meta-text">até {MAX_FACTORS} fatores</span>
        </div>
        <div className="space-y-2">
          {factors.map((factor, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                className={cn(fieldControlClass, "flex-1")}
                value={factor.baseId}
                onChange={(event) => {
                  const next = [...factors];
                  next[index] = { ...factor, baseId: event.target.value };
                  setFactors(next);
                }}
              >
                {bases.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.label}
                  </option>
                ))}
              </select>
              <span className="text-forest/40">×</span>
              <QtyInput
                step={0.01}
                ariaLabel="Multiplicador"
                value={factor.mult}
                onChange={(mult) => {
                  const next = [...factors];
                  next[index] = { ...factor, mult };
                  setFactors(next);
                }}
              />
              <button
                type="button"
                aria-label="Remover fator"
                onClick={() => setFactors(factors.filter((_, i) => i !== index))}
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-forest/40 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        {factors.length < MAX_FACTORS ? (
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => setFactors([...factors, { baseId: bases[0]?.id ?? "", mult: 1 }])}
          >
            <Plus data-icon="inline-start" />
            Adicionar fator
          </Button>
        ) : null}
        {factors.length === 0 ? (
          <p className="mt-2 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">
            Sem proporção cadastrada — este material não entra no cálculo automático até você
            definir um fator.
          </p>
        ) : (
          <p className="meta-text mt-2 tabular">
            {factors
              .map((factor) => `${basesById.get(factor.baseId)?.label ?? "?"} × ${factor.mult}`)
              .join("  ×  ")}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 px-5" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar material"}
        </Button>
      </div>
    </div>
  );
}
