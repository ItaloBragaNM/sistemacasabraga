"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { ChipRow, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardHeader } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatusPill } from "@/components/ui/status-pill";
import type { BaseKind, CalcBase } from "@/lib/cadastros/types";
import { drinkPremisesHint, DEFAULT_DRINK_PREMISES, type DrinkPremises } from "@/lib/types";
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
      return "Convidados do relatório";
    case "staff":
      return `Equipe: ${kind.role}`;
    case "islands":
      return "Ilhas do relatório";
    case "serviceTeam":
      return "Garçons + garçonetes";
    case "perGuests":
      return `1 a cada ${kind.per} convidados`;
    case "dishes":
      return "Nº de pratos vinculados";
    case "dishesWith":
      return kind.tag === "fritadeira"
        ? "Pratos do cardápio com fritadeira"
        : "Pratos do cardápio com rechaud";
    case "fixed":
      return "Valor fixo (1)";
    default:
      return "";
  }
}

function SettingsCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card flush className="flex h-full flex-col">
      <CardHeader
        title={title}
        description={description}
        actions={action}
        className="flex-nowrap items-start border-b border-line px-5 py-4"
      />
      <div className="flex-1 p-5">{children}</div>
    </Card>
  );
}

function PremiseGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg bg-cream p-4">
      <p className="group-title">{title}</p>
      {children}
    </div>
  );
}

export function ConfiguracoesAdmin() {
  const { data, ready } = useCadastros();

  return (
    <PageShell
      eyebrow="Configurações do Sistema"
      title="Configurações do Módulo de Cadastros"
      description="Estas regras valem para o cálculo de bebidas, para as categorias dos catálogos e para as bases usadas nos materiais."
    >
      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastros indisponíveis" description="Recarregue a página." />
      ) : (
        <>
          <DrinkPremisesSection />
          <div className="grid gap-4 lg:grid-cols-3">
            <DishCategoriesSection />
            <MaterialCategoriesSection />
            <InsumoCategoriesSection />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <StockLocationsSection />
            <BasesSection />
          </div>
        </>
      )}
    </PageShell>
  );
}

function DrinkPremisesSection() {
  const { data, setDrinkPremises } = useCadastros();
  if (!data) return null;
  const premises = data.drinkPremises ?? DEFAULT_DRINK_PREMISES;
  const patch = (key: keyof DrinkPremises, value: number) => {
    setDrinkPremises({ ...premises, [key]: value > 0 ? value : premises[key] });
  };
  return (
    <SettingsCard
      title="Premissas de bebidas"
      description="O sistema usa estes números ao calcular água, refrigerante e suco a partir dos convidados."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <PremiseGroup title="Água">
          <Field label="Convidados por garrafão">
            <input
              type="number"
              min={1}
              className={fieldControlClass}
              value={premises.aguaGuestsPerCarboy}
              onChange={(event) => patch("aguaGuestsPerCarboy", Number(event.target.value))}
            />
          </Field>
          <Field label="Litros do garrafão">
            <input
              type="number"
              min={1}
              className={fieldControlClass}
              value={premises.aguaCarboyLiters}
              onChange={(event) => patch("aguaCarboyLiters", Number(event.target.value))}
            />
          </Field>
        </PremiseGroup>
        <PremiseGroup title="Refrigerante">
          <Field label="Mililitros por pessoa">
            <input
              type="number"
              min={1}
              className={fieldControlClass}
              value={premises.refrigeranteMlPerPerson}
              onChange={(event) => patch("refrigeranteMlPerPerson", Number(event.target.value))}
            />
          </Field>
          <Field label="Mililitros da garrafa">
            <input
              type="number"
              min={1}
              className={fieldControlClass}
              value={premises.refrigeranteBottleMl}
              onChange={(event) => patch("refrigeranteBottleMl", Number(event.target.value))}
            />
          </Field>
        </PremiseGroup>
        <PremiseGroup title="Suco">
          <Field label="Mililitros por pessoa">
            <input
              type="number"
              min={1}
              className={fieldControlClass}
              value={premises.sucoMlPerPerson}
              onChange={(event) => patch("sucoMlPerPerson", Number(event.target.value))}
            />
          </Field>
        </PremiseGroup>
      </div>
      <p className="mt-4 rounded-lg bg-cream px-4 py-3 text-sm leading-relaxed text-forest/70 tabular">
        {drinkPremisesHint(premises)}
      </p>
    </SettingsCard>
  );
}

function DishCategoriesSection() {
  const { data, setDishCategories, upsertDish } = useCadastros();
  if (!data) return null;
  return (
    <CategoriesEditor
      title="Categorias do cardápio"
      description="Usadas no cadastro de pratos."
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
      description="Usadas no cadastro de materiais."
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
      description="Usadas no cadastro de insumos."
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

function StockLocationsSection() {
  const { data, upsertStockLocation, removeStockLocation } = useCadastros();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  if (!data) return null;
  const locations = [...(data.stockLocations ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  const save = () => {
    const value = (editing ? editing.name : name).trim();
    if (!value) return;
    const now = new Date().toISOString();
    if (editing) {
      const current = locations.find((item) => item.id === editing.id);
      if (!current) return;
      upsertStockLocation({ ...current, name: value, updatedAt: now });
      setEditing(null);
      toast.success("Local atualizado.");
    } else {
      upsertStockLocation({ id: uid(), name: value, createdAt: now, updatedAt: now });
      setName("");
      toast.success("Local cadastrado.");
    }
  };

  return (
    <SettingsCard
      title="Locais do estoque"
      description="Onde cada material fica guardado na casa."
    >
      <div className="flex flex-wrap gap-2">
        <input
          className={cn(fieldControlClass, "min-w-0 flex-1 sm:max-w-xs")}
          placeholder={editing ? "Nome do local" : "Novo local…"}
          value={editing ? editing.name : name}
          onChange={(event) => {
            if (editing) setEditing({ ...editing, name: event.target.value });
            else setName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        />
        <Button variant="outline" className="h-10 px-4" onClick={save}>
          {editing ? "Salvar" : "Adicionar"}
        </Button>
        {editing ? (
          <Button variant="outline" className="h-10 px-4" onClick={() => setEditing(null)}>
            Cancelar
          </Button>
        ) : null}
      </div>
      {locations.length === 0 ? (
        <p className="meta-text mt-4">Nenhum local cadastrado ainda.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {locations.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-forest">{item.name}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={`Editar ${item.name}`}
                  className="flex size-8 items-center justify-center rounded-md text-forest/40 hover:bg-forest/5 hover:text-forest"
                  onClick={() => setEditing({ id: item.id, name: item.name })}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${item.name}`}
                  className="flex size-8 items-center justify-center rounded-md text-forest/40 hover:bg-danger/10 hover:text-danger"
                  onClick={() => {
                    const used = data.materials.filter((material) => material.locationId === item.id).length;
                    if (
                      !window.confirm(
                        used > 0
                          ? `${used} material(is) usam "${item.name}". Excluir o local mesmo assim?`
                          : `Excluir o local "${item.name}"?`,
                      )
                    ) {
                      return;
                    }
                    removeStockLocation(item.id);
                    toast.success("Local excluído.");
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
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
    <SettingsCard title={title} description={description}>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <ChipRow key={category} className="gap-1.5">
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
                  className="flex size-6 items-center justify-center rounded-full text-forest/40 hover:text-danger"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 break-words text-sm text-forest/80">
                  {category}
                  <span className="ml-1.5 text-xs text-forest/40 tabular">{usageCount(category)}</span>
                </span>
                <button
                  type="button"
                  aria-label="Renomear"
                  onClick={() => {
                    setEditing(category);
                    setEditValue(category);
                  }}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-forest/40 hover:text-forest"
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Excluir"
                  onClick={() => remove(category)}
                  className="flex size-6 items-center justify-center rounded-full text-forest/40 hover:text-danger"
                >
                  <Trash2 className="size-3" />
                </button>
              </>
            )}
          </ChipRow>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className={cn(fieldControlClass, "min-w-0 flex-1 sm:max-w-xs")}
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
    </SettingsCard>
  );
}

function BasesSection() {
  const { data, upsertBase, removeBase } = useCadastros();
  const [adding, setAdding] = useState(false);

  if (!data) return null;

  return (
    <SettingsCard
      title="Bases de cálculo"
      description="Definem como a quantidade de cada material acompanha o relatório do evento."
      action={
        <Button variant="outline" size="sm" onClick={() => setAdding((value) => !value)}>
          <Plus data-icon="inline-start" />
          Nova base
        </Button>
      }
    >
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

      <ul className={cn("divide-y divide-line", adding && "mt-4")}>
        {data.bases.map((base) => (
          <li key={base.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium text-forest">
                {base.label}
                {base.builtIn ? <StatusPill>nativa</StatusPill> : null}
              </p>
              <p className="meta-text mt-0.5">
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
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-forest/40 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </SettingsCard>
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
          : `Campo do relatório: ${FIELD_OPTIONS.find((o) => o.value === field)?.label}.`,
      kind,
      builtIn: false,
    });
  };

  return (
    <div className="rounded-lg border border-line bg-forest/[0.02] p-4">
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
            <option value="field">Campo do relatório</option>
            <option value="perGuests">1 a cada N convidados</option>
          </select>
        </Field>
        {type === "field" ? (
          <Field label="Campo">
            <SearchableSelect
              value={field}
              onChange={setField}
              searchPlaceholder="Pesquisar campo…"
              options={FIELD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
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
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 px-4" onClick={submit}>
          Adicionar base
        </Button>
      </div>
    </div>
  );
}
