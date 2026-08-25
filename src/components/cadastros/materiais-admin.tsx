"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { basesMap, describeProportion, materialQuantity } from "@/lib/cadastros/calc";
import { MAX_FACTORS, type MaterialRecord, type ProportionFactor } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function MateriaisAdmin() {
  const { data, ready, upsertMaterial, removeMaterial } = useCadastros();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MaterialRecord | null>(null);
  const [open, setOpen] = useState(false);

  const bases = useMemo(() => (data ? basesMap(data) : new Map()), [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const list = [...data.materials].sort(
      (a, b) =>
        a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
    );
    if (!term) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term),
    );
  }, [data, search]);

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (material: MaterialRecord) => {
    setEditing(material);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        title="Materiais"
        description="Base da logística. Cada material tem uma proporção (base × multiplicador) que define a quantidade a separar por evento."
        action={
          <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
            <Plus data-icon="inline-start" />
            Novo material
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastros indisponíveis" description="Recarregue a página." />
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar material…" />

          {filtered.length === 0 ? (
            <EmptyBlock
              title="Nenhum material"
              description="Cadastre os materiais da casa para alimentar a separação por evento."
              action={
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo material
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <Th className="pl-5">Material</Th>
                    <Th>Proporção</Th>
                    <Th>Categoria</Th>
                    <Th align="center">Unid.</Th>
                    <Th align="right" className="pr-5">Ações</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((material) => (
                    <tr
                      key={material.id}
                      className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5 font-list font-medium text-forest">{material.name}</td>
                      <td className="py-3 pr-3 font-list text-[0.8rem] font-light text-forest/60">
                        {describeProportion(material, bases)}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-forest/6 px-2.5 py-1 text-xs text-forest/70">
                          {material.category}
                        </span>
                      </td>
                      <td className="py-3 text-center text-forest/70">{material.unit || "—"}</td>
                      <td className="py-3 pr-5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            aria-label="Editar"
                            onClick={() => startEdit(material)}
                            className="flex size-8 items-center justify-center rounded-lg text-forest/50 transition-colors hover:bg-forest/5 hover:text-forest"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Excluir"
                            onClick={() => {
                              if (window.confirm(`Excluir "${material.name}"?`)) {
                                removeMaterial(material.id);
                                toast.success("Material excluído.");
                              }
                            }}
                            className="flex size-8 items-center justify-center rounded-lg text-forest/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
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
            onCancel={() => setOpen(false)}
            onSubmit={(material) => {
              upsertMaterial(material);
              toast.success(editing ? "Material atualizado." : "Material cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "field-label py-3 pr-3 font-normal",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

const SIM_FIELDS = [
  { key: "convidados", label: "Convidados" },
  { key: "garcons", label: "Garçons" },
  { key: "garconetes", label: "Garçonetes" },
  { key: "copeiros", label: "Copeiras" },
  { key: "chefes", label: "Chefes" },
  { key: "ilhas", label: "Ilhas" },
  { key: "pratos", label: "Nº pratos" },
] as const;

type SimKey = (typeof SIM_FIELDS)[number]["key"];

function MaterialForm({
  initial,
  categories,
  bases,
  onSubmit,
  onCancel,
}: {
  initial: MaterialRecord | null;
  categories: string[];
  bases: import("@/lib/cadastros/types").CalcBase[];
  onSubmit: (material: MaterialRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "Outros");
  const [unit, setUnit] = useState(initial?.unit ?? "un");
  const [factors, setFactors] = useState<ProportionFactor[]>(
    initial?.factors.length ? initial.factors : [{ baseId: bases[0]?.id ?? "", mult: 1 }],
  );
  const [sim, setSim] = useState<Record<SimKey, number>>({
    convidados: 80,
    garcons: 4,
    garconetes: 4,
    copeiros: 2,
    chefes: 2,
    ilhas: 2,
    pratos: 1,
  });

  const basesById = useMemo(() => new Map(bases.map((base) => [base.id, base])), [bases]);

  const simQty = useMemo(() => {
    const temp: MaterialRecord = {
      id: "sim",
      name,
      category,
      unit,
      factors,
      createdAt: "",
      updatedAt: "",
    };
    return materialQuantity(temp, basesById, {
      convidados: sim.convidados,
      garcons: sim.garcons,
      garconetes: sim.garconetes,
      copeiros: sim.copeiros,
      chefes: sim.chefes,
      ilhas: sim.ilhas,
      selectedDishIds: [],
    }, sim.pratos);
  }, [name, category, unit, factors, basesById, sim]);

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do material.");
      return;
    }
    if (factors.length === 0 || factors.some((factor) => !factor.baseId)) {
      toast.error("Defina ao menos um fator de proporção.");
      return;
    }
    const now = new Date().toISOString();
    onSubmit({
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      unit: unit.trim(),
      factors: factors.map((factor) => ({ baseId: factor.baseId, mult: factor.mult || 0 })),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
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
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="field-label">Proporção (base × multiplicador)</p>
          <span className="text-xs font-light text-forest/45">até {MAX_FACTORS} fatores</span>
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
              <input
                type="number"
                step="0.01"
                min={0}
                className={cn(fieldControlClass, "w-28")}
                value={factor.mult}
                onChange={(event) => {
                  const next = [...factors];
                  next[index] = { ...factor, mult: Number(event.target.value) };
                  setFactors(next);
                }}
              />
              <button
                type="button"
                aria-label="Remover fator"
                disabled={factors.length <= 1}
                onClick={() => setFactors(factors.filter((_, i) => i !== index))}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-forest/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-30 disabled:hover:bg-transparent"
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
        <p className="mt-2 text-xs font-light text-forest/45">
          {factors
            .map((factor) => `${basesById.get(factor.baseId)?.label ?? "?"} × ${factor.mult}`)
            .join("  ×  ") || "—"}
        </p>
      </div>

      <div className="rounded-xl border border-forest/10 bg-forest/[0.02] p-4">
        <p className="field-label mb-3">Simulador — arredonda sempre para cima</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SIM_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <input
                type="number"
                min={0}
                className={fieldControlClass}
                value={sim[field.key]}
                onChange={(event) =>
                  setSim((current) => ({ ...current, [field.key]: Number(event.target.value) }))
                }
              />
            </Field>
          ))}
          <div className="flex flex-col justify-end">
            <p className="field-label">Resultado</p>
            <p className="font-display mt-1 text-2xl text-forest">
              {simQty} <span className="text-base text-forest/50">{unit || "un"}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar material"}
        </Button>
      </div>
    </div>
  );
}
