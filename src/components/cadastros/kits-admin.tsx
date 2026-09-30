"use client";

import { Bolt, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { SortButton, compareSort, useColumnSort } from "@/components/cadastros/sort-header";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { QtyInput } from "@/components/ui/qty-input";
import { StatusPill } from "@/components/ui/status-pill";
import {
  type ExtraCatalogItem,
  type MaterialKit,
  type MaterialKitItem,
} from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function KitsAdmin() {
  const { data, ready, upsertKit, removeKit, upsertExtra, removeExtra } = useCadastros();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MaterialKit | null>(null);
  const [kitOpen, setKitOpen] = useState(false);
  const [extraName, setExtraName] = useState("");
  const [editingExtra, setEditingExtra] = useState<ExtraCatalogItem | null>(null);
  const kitSort = useColumnSort<"name" | "scale">("name");
  const extraSort = useColumnSort<"name">("name");

  const extras = data?.extras ?? [];
  const materials = data?.materials ?? [];
  const bases = data?.bases ?? [];
  const baseLabel = (id: string) => bases.find((base) => base.id === id)?.label ?? "Fixo por evento";

  const filteredKits = useMemo(() => {
    const term = search.trim().toLowerCase();
    const baseList = data?.bases ?? [];
    const labelOf = (id: string) => baseList.find((base) => base.id === id)?.label ?? "Fixo por evento";
    const list = [...(data?.kits ?? [])].sort((a, b) => {
      const value = kitSort.key === "scale" ? labelOf(a.scaleBaseId) : a.name;
      const other = kitSort.key === "scale" ? labelOf(b.scaleBaseId) : b.name;
      return compareSort(value, other, kitSort.dir) || a.name.localeCompare(b.name, "pt-BR");
    });
    if (!term) return list;
    const materialName = new Map((data?.materials ?? []).map((item) => [item.id, item.name]));
    return list.filter((kit) => {
      if (kit.name.toLowerCase().includes(term)) return true;
      if (labelOf(kit.scaleBaseId).toLowerCase().includes(term)) return true;
      return kit.items.some((item) =>
        (materialName.get(item.materialId) ?? "").toLowerCase().includes(term),
      );
    });
  }, [data, search, kitSort.key, kitSort.dir]);

  const startNew = () => {
    setEditing(null);
    setKitOpen(true);
  };

  const saveExtra = () => {
    const name = (editingExtra?.name ?? extraName).trim();
    if (!name) return;
    const now = new Date().toISOString();
    if (editingExtra) {
      upsertExtra({ ...editingExtra, name, updatedAt: now });
      setEditingExtra(null);
      toast.success("Extra atualizado.");
    } else {
      upsertExtra({ id: uid(), name, createdAt: now, updatedAt: now });
      setExtraName("");
      toast.success("Extra cadastrado.");
    }
  };

  return (
    <PageShell>
      <CadastrosHeader
        title="Kits de Materiais"
        action={
          <Button className="h-10 px-5" onClick={startNew}>
            <Plus data-icon="inline-start" />
            Novo kit
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastros indisponíveis" description="Recarregue a página." />
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar kit…" />

          {filteredKits.length === 0 ? (
            <EmptyBlock
              title="Nenhum kit"
              description="Crie kits como Cozinha, Rechaud, Higiene ou Garçom para reutilizar na separação de cada evento."
              action={
                <Button className="h-10" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo kit
                </Button>
              }
            />
          ) : (
            <Card flush>
              <div className="flex items-center gap-6 border-b border-line px-5 py-3">
                <SortButton
                  label="Kit"
                  active={kitSort.key === "name"}
                  dir={kitSort.dir}
                  onClick={() => kitSort.toggle("name")}
                />
                <SortButton
                  label="Escala"
                  active={kitSort.key === "scale"}
                  dir={kitSort.dir}
                  onClick={() => kitSort.toggle("scale")}
                />
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                {filteredKits.map((kit) => (
                  <KitCard
                    key={kit.id}
                    kit={kit}
                    scaleLabel={baseLabel(kit.scaleBaseId)}
                    materialName={new Map(materials.map((item) => [item.id, item.name]))}
                    onEdit={() => {
                      setEditing(kit);
                      setKitOpen(true);
                    }}
                    onDelete={() => {
                      if (window.confirm(`Excluir "${kit.name}"?`)) {
                        removeKit(kit.id);
                        toast.success("Kit excluído.");
                      }
                    }}
                  />
                ))}
              </div>
            </Card>
          )}

          <section className="space-y-4">
            <div>
              <p className="group-title">Separação</p>
              <h2 className="section-title mt-1">Extras / Equipamentos</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className={cn(fieldControlClass, "min-w-0 flex-1 sm:max-w-sm")}
                placeholder={editingExtra ? "Nome do extra" : "Novo extra…"}
                value={editingExtra ? editingExtra.name : extraName}
                onChange={(event) => {
                  if (editingExtra) setEditingExtra({ ...editingExtra, name: event.target.value });
                  else setExtraName(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveExtra();
                  }
                }}
              />
              <Button className="h-10 px-4" onClick={saveExtra}>
                {editingExtra ? "Salvar" : "Adicionar"}
              </Button>
              {editingExtra ? (
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => setEditingExtra(null)}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
            {extras.length === 0 ? (
              <EmptyBlock title="Nenhum extra cadastrado" description="Adicione extras e equipamentos usados na separação." />
            ) : (
              <Card flush>
                <div className="border-b border-line px-5 py-3">
                  <SortButton label="Extra" dir={extraSort.dir} onClick={() => extraSort.toggle("name")} />
                </div>
                <ul>
                  {[...extras]
                    .sort((a, b) => compareSort(a.name, b.name, extraSort.dir))
                    .map((item, index) => (
                      <li
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between gap-3 py-2 pl-5 pr-4",
                          index > 0 && "border-t border-line",
                        )}
                      >
                        <span className="text-sm text-forest">{item.name}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`Editar ${item.name}`}
                            className="flex size-8 items-center justify-center rounded-md text-forest/40 hover:bg-forest/5 hover:text-forest"
                            onClick={() => setEditingExtra(item)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Excluir ${item.name}`}
                            className="flex size-8 items-center justify-center rounded-md text-forest/40 hover:bg-danger/10 hover:text-danger"
                            onClick={() => {
                              if (window.confirm(`Excluir "${item.name}"?`)) {
                                removeExtra(item.id);
                                toast.success("Extra excluído.");
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}

      <KitEditor
        open={kitOpen}
        kit={editing}
        materials={materials}
        bases={bases}
        onClose={() => setKitOpen(false)}
        onSave={(kit) => {
          upsertKit(kit);
          setKitOpen(false);
          toast.success(editing ? "Kit atualizado." : "Kit criado.");
        }}
      />
    </PageShell>
  );
}

function KitCard({
  kit,
  scaleLabel,
  materialName,
  onEdit,
  onDelete,
}: {
  kit: MaterialKit;
  scaleLabel: string;
  materialName: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const scaled = kit.scaleBaseId !== "base-fixo";
  return (
    <article className="flex flex-col rounded-lg border border-line bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="section-title">{kit.name}</h3>
        {scaled ? <ScaleBadge label={scaleLabel} /> : null}
      </div>
      {kit.items.length === 0 ? (
        <p className="meta-text flex-1">Nenhum material neste kit.</p>
      ) : (
        <ul className="flex-1 space-y-1.5">
          {kit.items.map((item) => (
            <li
              key={`${item.materialId}-${item.qtyPerKit}`}
              className="flex items-baseline justify-between gap-3 text-sm text-forest/75"
            >
              <span>{materialName.get(item.materialId) ?? "Material removido"}</span>
              <span className="shrink-0 text-forest tabular">
                {item.qtyPerKit}
                {scaled ? <span className="meta-text ml-1 text-xs">× kit</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="h-9 flex-1 px-3" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          Editar
        </Button>
        <Button variant="destructive" size="icon" className="size-9" aria-label={`Excluir ${kit.name}`} onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </article>
  );
}

function ScaleBadge({ label }: { label: string }) {
  return (
    <StatusPill tone="info" className="gap-1">
      <Bolt className="size-3 shrink-0" />
      {label}
    </StatusPill>
  );
}

function KitEditor({
  open,
  kit,
  materials,
  bases,
  onClose,
  onSave,
}: {
  open: boolean;
  kit: MaterialKit | null;
  materials: { id: string; name: string; category: string }[];
  bases: { id: string; label: string }[];
  onClose: () => void;
  onSave: (kit: MaterialKit) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={kit ? "Editar kit" : "Novo kit"} wide>
      <KitEditorForm
        key={kit?.id ?? "new"}
        kit={kit}
        materials={materials}
        bases={bases}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
}

function KitEditorForm({
  kit,
  materials,
  bases,
  onClose,
  onSave,
}: {
  kit: MaterialKit | null;
  materials: { id: string; name: string; category: string }[];
  bases: { id: string; label: string }[];
  onClose: () => void;
  onSave: (kit: MaterialKit) => void;
}) {
  const [name, setName] = useState(kit?.name ?? "");
  const [scaleBaseId, setScaleBaseId] = useState(kit?.scaleBaseId ?? "base-fixo");
  const [items, setItems] = useState<MaterialKitItem[]>(
    () => kit?.items.map((item) => ({ ...item })) ?? [],
  );
  const [pickQuery, setPickQuery] = useState("");

  const sortedMaterials = useMemo(
    () =>
      [...materials].sort(
        (a, b) =>
          a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
      ),
    [materials],
  );

  const used = new Set(items.map((item) => item.materialId));
  const available = sortedMaterials.filter((item) => !used.has(item.id));
  const pickTerm = pickQuery.trim().toLowerCase();
  const filteredAvailable = pickTerm
    ? available.filter(
        (item) =>
          item.name.toLowerCase().includes(pickTerm) ||
          item.category.toLowerCase().includes(pickTerm),
      )
    : available;
  const materialName = new Map(materials.map((item) => [item.id, item.name]));

  const addMaterial = (id: string) => {
    if (!id) return;
    setItems((current) => {
      if (current.some((item) => item.materialId === id)) return current;
      return [...current, { materialId: id, qtyPerKit: 1 }];
    });
    setPickQuery("");
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Informe o nome do kit.");
      return;
    }
    const now = new Date().toISOString();
    onSave({
      id: kit?.id ?? uid(),
      name: trimmed,
      scaleBaseId,
      items,
      createdAt: kit?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <>
      <div className="space-y-4">
        <Field label="Nome">
          <input
            className={fieldControlClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Kit Higiene"
          />
        </Field>
        <Field label="Base de cálculo">
          <SearchableSelect
            value={scaleBaseId}
            onChange={setScaleBaseId}
            searchPlaceholder="Pesquisar base…"
            options={bases.map((base) => ({ value: base.id, label: base.label }))}
          />
        </Field>
        <p className="meta-text">
          A mesma lista de Configurações → Bases de cálculo. Na separação, a quantidade de kits
          começa com o valor dessa base (ex.: Rechauds = pratos do evento com rechaud) e pode ser
          ajustada.
        </p>

        <div className="space-y-2">
          <p className="field-label">Materiais do kit</p>
          {items.length === 0 ? (
            <p className="meta-text">Nenhum material ainda.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-line bg-white">
              {items.map((item, index) => (
                <li
                  key={`${item.materialId}-${index}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2",
                    index > 0 && "border-t border-line",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-forest">
                    {materialName.get(item.materialId) ?? "Material removido"}
                  </span>
                  <QtyInput
                    step="any"
                    ariaLabel={`Quantidade por kit de ${materialName.get(item.materialId) ?? "material"}`}
                    value={item.qtyPerKit}
                    onChange={(qtyPerKit) => {
                      setItems((current) =>
                        current.map((entry, i) => (i === index ? { ...entry, qtyPerKit } : entry)),
                      );
                    }}
                  />
                  <span className="meta-text w-9 shrink-0">/ kit</span>
                  <button
                    type="button"
                    aria-label="Remover material"
                    className="flex size-8 items-center justify-center rounded-md text-forest/35 hover:bg-danger/10 hover:text-danger"
                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div
            className="space-y-2"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (filteredAvailable[0]) addMaterial(filteredAvailable[0].id);
            }}
          >
            <SearchInput value={pickQuery} onChange={setPickQuery} placeholder="Buscar material…" />
            {available.length === 0 ? (
              <p className="meta-text">
                {materials.length === 0
                  ? "Cadastre materiais em Cadastros → Materiais."
                  : "Todos os materiais já estão neste kit."}
              </p>
            ) : filteredAvailable.length === 0 ? (
              <p className="meta-text">Nenhum material encontrado.</p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-white p-1">
                {filteredAvailable.map((material) => (
                  <button
                    key={material.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-forest hover:bg-forest/[0.03]"
                    onClick={() => addMaterial(material.id)}
                  >
                    <span className="min-w-0 truncate">{material.name}</span>
                    <span className="meta-text shrink-0">{material.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" className="h-10 px-4" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="h-10 px-5" onClick={submit}>
            Salvar kit
          </Button>
        </div>
      </div>
    </>
  );
}
