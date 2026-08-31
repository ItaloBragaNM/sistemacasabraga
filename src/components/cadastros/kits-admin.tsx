"use client";

import { Bolt, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
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

  const kits = data?.kits ?? [];
  const extras = data?.extras ?? [];
  const materials = data?.materials ?? [];
  const bases = data?.bases ?? [];
  const baseLabel = (id: string) => bases.find((base) => base.id === id)?.label ?? "Fixo por evento";

  const filteredKits = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = [...kits].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (!term) return list;
    const materialName = new Map(materials.map((item) => [item.id, item.name]));
    return list.filter((kit) => {
      if (kit.name.toLowerCase().includes(term)) return true;
      if (baseLabel(kit.scaleBaseId).toLowerCase().includes(term)) return true;
      return kit.items.some((item) =>
        (materialName.get(item.materialId) ?? "").toLowerCase().includes(term),
      );
    });
  }, [kits, materials, search, bases]);

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
    <div className="mx-auto max-w-5xl space-y-10 pb-16">
      <CadastrosHeader
        title="Kits de Materiais"
        description="Modelos de transporte enviados junto com o evento. Cada kit define os materiais, a quantidade por kit e a base de cálculo (as mesmas de Configurações → Bases de cálculo)."
        action={
          <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
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
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo kit
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
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
          )}

          <section className="space-y-4">
            <div>
              <p className="font-section text-[0.68rem] text-terracotta">Separação</p>
              <h2 className="font-display mt-1 text-3xl text-forest">Extras / Equipamentos</h2>
              <p className="mt-1 max-w-2xl text-sm font-light text-forest/60">
                Itens avulsos apresentados como checklist na separação do evento — forno, mesas,
                toalhas e outros equipamentos que não entram pelos pratos nem pelos kits.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className={cn(fieldControlClass, "max-w-sm")}
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
              <Button className="h-10 bg-forest px-4 text-cream hover:bg-petrol" onClick={saveExtra}>
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
              <p className="text-sm font-light text-forest/50">Nenhum extra cadastrado.</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
                {extras.map((item, index) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3",
                      index > 0 && "border-t border-forest/8",
                    )}
                  >
                    <span className="font-list text-sm text-forest">{item.name}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${item.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-forest/40 hover:bg-forest/5 hover:text-forest"
                        onClick={() => setEditingExtra(item)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${item.name}`}
                        className="flex size-8 items-center justify-center rounded-lg text-forest/40 hover:bg-terracotta/10 hover:text-terracotta"
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
    </div>
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
    <article className="flex flex-col rounded-2xl border border-forest/10 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-2xl text-forest">{kit.name}</h3>
        {scaled ? <ScaleBadge label={scaleLabel} /> : null}
      </div>
      {kit.items.length === 0 ? (
        <p className="flex-1 text-sm font-light text-forest/45">Nenhum material neste kit.</p>
      ) : (
        <ul className="flex-1 space-y-1.5">
          {kit.items.map((item) => (
            <li
              key={`${item.materialId}-${item.qtyPerKit}`}
              className="flex items-baseline justify-between gap-3 text-sm text-forest/75"
            >
              <span>{materialName.get(item.materialId) ?? "Material removido"}</span>
              <span className="shrink-0 font-list text-forest">
                {item.qtyPerKit}
                {scaled ? (
                  <span className="ml-1 text-xs font-light text-forest/45">× kit</span>
                ) : null}
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
        <Button
          variant="outline"
          className="h-9 px-3 text-terracotta hover:bg-terracotta/10"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </article>
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
  const [name, setName] = useState("");
  const [scaleBaseId, setScaleBaseId] = useState("base-fixo");
  const [items, setItems] = useState<MaterialKitItem[]>([]);
  const [pickId, setPickId] = useState("");

  const sortedMaterials = useMemo(
    () =>
      [...materials].sort(
        (a, b) =>
          a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
      ),
    [materials],
  );

  useEffect(() => {
    if (!open) return;
    setName(kit?.name ?? "");
    setScaleBaseId(kit?.scaleBaseId ?? "base-fixo");
    setItems(kit?.items.map((item) => ({ ...item })) ?? []);
    setPickId("");
  }, [open, kit]);

  const used = new Set(items.map((item) => item.materialId));
  const available = sortedMaterials.filter((item) => !used.has(item.id));
  const materialName = new Map(materials.map((item) => [item.id, item.name]));

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
    <Modal open={open} onClose={onClose} title={kit ? "Editar kit" : "Novo kit"} wide>
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
          <select
            className={fieldControlClass}
            value={scaleBaseId}
            onChange={(event) => setScaleBaseId(event.target.value)}
          >
            {bases.map((base) => (
              <option key={base.id} value={base.id}>
                {base.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs font-light text-forest/50">
          A mesma lista de Configurações → Bases de cálculo. Na separação, a quantidade de kits
          começa com o valor dessa base (ex.: Rechauds = pratos do evento com rechaud) e pode ser
          ajustada.
        </p>

        <div className="space-y-2">
          <p className="field-label">Materiais do kit</p>
          {items.length === 0 ? (
            <p className="text-sm font-light text-forest/45">Nenhum material ainda.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-forest/10">
              {items.map((item, index) => (
                <li
                  key={`${item.materialId}-${index}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2",
                    index > 0 && "border-t border-forest/8",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-forest">
                    {materialName.get(item.materialId) ?? "Material removido"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className={cn(fieldControlClass, "h-9 w-20")}
                    value={item.qtyPerKit}
                    onChange={(event) => {
                      const qtyPerKit = Number(event.target.value);
                      setItems((current) =>
                        current.map((entry, i) => (i === index ? { ...entry, qtyPerKit } : entry)),
                      );
                    }}
                  />
                  <span className="text-xs text-forest/45">/ kit</span>
                  <button
                    type="button"
                    aria-label="Remover material"
                    className="flex size-8 items-center justify-center rounded-lg text-forest/35 hover:bg-terracotta/10 hover:text-terracotta"
                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <select
              className={cn(fieldControlClass, "flex-1")}
              value={pickId}
              onChange={(event) => setPickId(event.target.value)}
            >
              <option value="">Adicionar material…</option>
              {available.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.category} · {material.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="h-10 px-3"
              disabled={!pickId}
              onClick={() => {
                if (!pickId) return;
                setItems((current) => [...current, { materialId: pickId, qtyPerKit: 1 }]);
                setPickId("");
              }}
            >
              <Plus data-icon="inline-start" />
              Incluir
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="h-10 px-4" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={submit}>
            Salvar kit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
