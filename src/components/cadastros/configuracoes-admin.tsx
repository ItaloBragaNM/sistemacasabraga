"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, LoadingBlock } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import type { BaseKind, CalcBase } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

const FIELD_OPTIONS: { value: string; label: string; kind: BaseKind }[] = [
  { value: "guests", label: "Convidados", kind: { type: "guests" } },
  { value: "garcons", label: "Garçons", kind: { type: "staff", role: "garcons" } },
  { value: "garconetes", label: "Garçonetes", kind: { type: "staff", role: "garconetes" } },
  { value: "copeiros", label: "Copeiras", kind: { type: "staff", role: "copeiros" } },
  { value: "chefes", label: "Chefes", kind: { type: "staff", role: "chefes" } },
  { value: "islands", label: "Ilhas", kind: { type: "islands" } },
];

function describeKind(kind: BaseKind): string {
  switch (kind.type) {
    case "guests":
      return "Convidados da ficha";
    case "staff":
      return `Equipe: ${kind.role}`;
    case "islands":
      return "Ilhas da ficha";
    case "serviceTeam":
      return "Garçons + garçonetes";
    case "perGuests":
      return `1 a cada ${kind.per} convidados`;
    case "dishes":
      return "Nº de pratos vinculados";
    case "fixed":
      return "Valor fixo (1)";
    default:
      return "";
  }
}

export function ConfiguracoesAdmin() {
  const { data, ready } = useCadastros();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <CadastrosHeader
        eyebrow="Configurações do Sistema"
        title="Configurações do Módulo de Cadastros"
        description="Ajuste as categorias do cardápio, de materiais e de insumos, e as bases de cálculo usadas nas proporções. As bases nativas não podem ser removidas."
      />
      {!ready ? (
        <LoadingBlock />
      ) : !data ? null : (
        <>
          <DishCategoriesSection />
          <MaterialCategoriesSection />
          <InsumoCategoriesSection />
          <BasesSection />
        </>
      )}
    </div>
  );
}

function DishCategoriesSection() {
  const { data, setDishCategories, upsertDish } = useCadastros();
  if (!data) return null;
  return (
    <CategoriesEditor
      title="Categorias do cardápio"
      description="Usadas para agrupar os pratos no catálogo e na ficha do evento."
      categories={data.dishCategories}
      onSetCategories={setDishCategories}
      usageCount={(name) => data.dishes.filter((dish) => dish.category === name).length}
      onRename={(oldName, newName) =>
        data.dishes
          .filter((dish) => dish.category === oldName)
          .forEach((dish) =>
            upsertDish({ ...dish, category: newName, updatedAt: new Date().toISOString() }),
          )
      }
    />
  );
}

function MaterialCategoriesSection() {
  const { data, setCategories, upsertMaterial } = useCadastros();
  if (!data) return null;
  return (
    <CategoriesEditor
      title="Categorias de materiais"
      description="Usadas para agrupar os materiais no cadastro, na separação e no estoque."
      categories={data.materialCategories}
      onSetCategories={setCategories}
      usageCount={(name) => data.materials.filter((m) => m.category === name).length}
      onRename={(oldName, newName) =>
        data.materials
          .filter((m) => m.category === oldName)
          .forEach((m) =>
            upsertMaterial({ ...m, category: newName, updatedAt: new Date().toISOString() }),
          )
      }
    />
  );
}

function InsumoCategoriesSection() {
  const { data, setInsumoCategories, upsertInsumo } = useCadastros();
  if (!data) return null;
  return (
    <CategoriesEditor
      title="Categorias de insumos"
      description="Usadas para agrupar os insumos da cozinha."
      categories={data.insumoCategories}
      onSetCategories={setInsumoCategories}
      usageCount={(name) => data.insumos.filter((i) => i.category === name).length}
      onRename={(oldName, newName) =>
        data.insumos
          .filter((i) => i.category === oldName)
          .forEach((i) =>
            upsertInsumo({ ...i, category: newName, updatedAt: new Date().toISOString() }),
          )
      }
    />
  );
}

function CategoriesEditor({
  title,
  description,
  categories,
  onSetCategories,
  usageCount,
  onRename,
}: {
  title: string;
  description: string;
  categories: string[];
  onSetCategories: (categories: string[]) => void;
  usageCount: (name: string) => number;
  onRename: (oldName: string, newName: string) => void;
}) {
  const [newCategory, setNewCategory] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const add = () => {
    const value = newCategory.trim();
    if (!value) return;
    if (categories.some((item) => item.toLowerCase() === value.toLowerCase())) {
      toast.error("Categoria já existe.");
      return;
    }
    onSetCategories([...categories, value]);
    setNewCategory("");
    toast.success("Categoria adicionada.");
  };

  const rename = (oldName: string) => {
    const value = editValue.trim();
    if (!value) return;
    if (
      value.toLowerCase() !== oldName.toLowerCase() &&
      categories.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      toast.error("Já existe uma categoria com esse nome.");
      return;
    }
    onSetCategories(categories.map((item) => (item === oldName ? value : item)));
    onRename(oldName, value);
    setEditing(null);
    toast.success("Categoria renomeada.");
  };

  const remove = (name: string) => {
    if (categories.length <= 1) {
      toast.error("Mantenha ao menos uma categoria.");
      return;
    }
    const used = usageCount(name);
    if (
      !window.confirm(
        used > 0
          ? `${used} registro(s) usam "${name}". Excluir a categoria mesmo assim?`
          : `Excluir a categoria "${name}"?`,
      )
    ) {
      return;
    }
    onSetCategories(categories.filter((item) => item !== name));
    toast.success("Categoria excluída.");
  };

  return (
    <section className="rounded-2xl border border-forest/10 bg-white p-5">
      <h2 className="font-section text-[0.82rem] text-forest">{title}</h2>
      <p className="mt-1 text-sm font-light text-forest/55">{description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <div
            key={category}
            className="flex items-center gap-1.5 rounded-full border border-forest/12 bg-forest/[0.03] py-1 pl-3 pr-1.5"
          >
            {editing === category ? (
              <>
                <input
                  autoFocus
                  className="w-32 bg-transparent text-sm text-forest outline-none"
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && rename(category)}
                />
                <button
                  type="button"
                  aria-label="Confirmar"
                  onClick={() => rename(category)}
                  className="flex size-6 items-center justify-center rounded-full text-forest/60 hover:text-forest"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Cancelar"
                  onClick={() => setEditing(null)}
                  className="flex size-6 items-center justify-center rounded-full text-forest/40 hover:text-terracotta"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-forest/80">{category}</span>
                <button
                  type="button"
                  aria-label="Renomear"
                  onClick={() => {
                    setEditing(category);
                    setEditValue(category);
                  }}
                  className="flex size-6 items-center justify-center rounded-full text-forest/40 hover:text-forest"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Excluir"
                  onClick={() => remove(category)}
                  className="flex size-6 items-center justify-center rounded-full text-forest/40 hover:text-terracotta"
                >
                  <Trash2 className="size-3" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className={cn(fieldControlClass, "max-w-xs")}
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && add()}
          placeholder="Nova categoria…"
        />
        <Button variant="outline" className="h-10 px-4" onClick={add}>
          <Plus data-icon="inline-start" />
          Adicionar
        </Button>
      </div>
    </section>
  );
}

function BasesSection() {
  const { data, upsertBase, removeBase } = useCadastros();
  const [adding, setAdding] = useState(false);

  if (!data) return null;

  return (
    <section className="rounded-2xl border border-forest/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-section text-[0.82rem] text-forest">Bases de cálculo</h2>
          <p className="mt-1 text-sm font-light text-forest/55">
            Cada base é um valor lido da ficha do evento (ou derivado dele) usado nas proporções.
          </p>
        </div>
        <Button variant="outline" className="h-10 px-4" onClick={() => setAdding((v) => !v)}>
          <Plus data-icon="inline-start" />
          Nova base
        </Button>
      </div>

      {adding ? (
        <NewBaseForm
          onCancel={() => setAdding(false)}
          onSubmit={(base) => {
            upsertBase(base);
            setAdding(false);
            toast.success("Base adicionada.");
          }}
        />
      ) : null}

      <ul className="mt-4 divide-y divide-forest/8">
        {data.bases.map((base) => (
          <li key={base.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-list font-medium text-forest">
                {base.label}
                {base.builtIn ? (
                  <span className="ml-2 rounded-full bg-forest/6 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-forest/45">
                    nativa
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs font-light text-forest/55">
                {base.description} · {describeKind(base.kind)}
              </p>
            </div>
            {!base.builtIn ? (
              <button
                type="button"
                aria-label="Excluir base"
                onClick={() => {
                  const used = data.materials.some((material) =>
                    material.factors.some((factor) => factor.baseId === base.id),
                  );
                  if (used && !window.confirm("Alguns materiais usam esta base. Excluir mesmo assim?")) {
                    return;
                  }
                  removeBase(base.id);
                  toast.success("Base excluída.");
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-forest/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewBaseForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (base: CalcBase) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"field" | "perGuests">("field");
  const [field, setField] = useState(FIELD_OPTIONS[0].value);
  const [per, setPer] = useState(100);

  const kind: BaseKind = useMemo(() => {
    if (type === "perGuests") return { type: "perGuests", per: per > 0 ? per : 1 };
    return FIELD_OPTIONS.find((option) => option.value === field)?.kind ?? { type: "guests" };
  }, [type, field, per]);

  const submit = () => {
    if (!label.trim()) {
      toast.error("Informe o nome da base.");
      return;
    }
    onSubmit({
      id: uid(),
      label: label.trim(),
      description:
        type === "perGuests"
          ? `1 a cada ${per} convidados.`
          : `Campo da ficha: ${FIELD_OPTIONS.find((o) => o.value === field)?.label}.`,
      kind,
      builtIn: false,
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-forest/12 bg-forest/[0.02] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome da base">
          <input
            className={fieldControlClass}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex.: Rechauds"
          />
        </Field>
        <Field label="Tipo">
          <select
            className={fieldControlClass}
            value={type}
            onChange={(event) => setType(event.target.value as "field" | "perGuests")}
          >
            <option value="field">Campo da ficha</option>
            <option value="perGuests">1 a cada N convidados</option>
          </select>
        </Field>
        {type === "field" ? (
          <Field label="Campo">
            <select
              className={fieldControlClass}
              value={field}
              onChange={(event) => setField(event.target.value)}
            >
              {FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="A cada N convidados">
            <input
              type="number"
              min={1}
              className={fieldControlClass}
              value={per}
              onChange={(event) => setPer(Number(event.target.value))}
            />
          </Field>
        )}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" className="h-9 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-9 bg-forest px-4 text-cream hover:bg-petrol" onClick={submit}>
          Adicionar base
        </Button>
      </div>
    </div>
  );
}
