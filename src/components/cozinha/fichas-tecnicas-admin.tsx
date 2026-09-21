"use client";

import { FileDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { downloadTechnicalSheetPdf } from "@/components/cozinha/ficha-tecnica-pdf";
import { useFichasTecnicas } from "@/components/cozinha/fichas-tecnicas-provider";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { uid } from "@/lib/event-factory";
import {
  adjustedQuantity,
  costPerPortion,
  ingredientTotal,
  projectedCmv,
  recipeCost,
} from "@/lib/fichas-tecnicas/calc";
import {
  blankRecipeIngredient,
  blankTechnicalSheet,
  RECIPE_UNITS,
  type RecipeIngredient,
  type TechnicalSheet,
} from "@/lib/fichas-tecnicas/types";
import { cn } from "@/lib/utils";

export function FichasTecnicasAdmin() {
  const { data, ready, upsertSheet, removeSheet } = useFichasTecnicas();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);

  const sheets = [...(data?.sheets ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const editing = sheets.find((item) => item.id === editingId) ?? null;

  if (editing) {
    return (
      <FichaEditor
        initial={editing}
        onBack={() => setEditingId(null)}
        onSave={(sheet) => {
          upsertSheet(sheet);
          toast.success("Ficha técnica salva.");
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Cozinha"
        title="Fichas técnicas"
        action={
          <Button
            className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
            onClick={() => {
              const sheet = blankTechnicalSheet(uid());
              sheet.name = "Nova receita";
              upsertSheet(sheet);
              setEditingId(sheet.id);
            }}
          >
            <Plus data-icon="inline-start" />
            Nova ficha
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : sheets.length === 0 ? (
        <EmptyBlock
          title="Nenhuma ficha técnica"
          description="Crie a receita no modelo da ficha de papel: ingredientes, rendimento, custo e modo de preparo."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-3 pl-5 font-normal">Item</th>
                <th className="field-label py-3 font-normal">Classificação</th>
                <th className="field-label py-3 font-normal">Custo</th>
                <th className="field-label py-3 font-normal">CMV</th>
                <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.id} className="border-b border-forest/5 last:border-0">
                  <td className="py-3 pl-5">
                    <p className="font-medium text-forest">{sheet.name}</p>
                    <p className="text-xs font-light text-forest/45">{sheet.sector}</p>
                  </td>
                  <td className="py-3 text-forest/70">{sheet.classification || "—"}</td>
                  <td className="py-3 text-forest/70">{formatBRL(recipeCost(sheet))}</td>
                  <td className="py-3 text-forest/70">{formatDecimal(projectedCmv(sheet), 1)}%</td>
                  <td className="py-3 pr-5 text-right">
                    <button type="button" className="text-sm text-forest/60 hover:text-forest" onClick={() => setEditingId(sheet.id)}>
                      Abrir
                    </button>
                    <span className="mx-2 text-forest/20">·</span>
                    <button type="button" className="text-sm text-forest/60 hover:text-forest" onClick={() => setEditingId(sheet.id)}>
                      Editar
                    </button>
                    <span className="mx-2 text-forest/20">·</span>
                    <button
                      type="button"
                      className="text-sm text-forest/60 hover:text-forest"
                      disabled={pdfId === sheet.id}
                      onClick={async () => {
                        try {
                          setPdfId(sheet.id);
                          await downloadTechnicalSheetPdf(sheet);
                          toast.success("PDF da ficha baixado.");
                        } catch (error) {
                          console.error(error);
                          toast.error("Não foi possível gerar o PDF.");
                        } finally {
                          setPdfId(null);
                        }
                      }}
                    >
                      PDF
                    </button>
                    <span className="mx-2 text-forest/20">·</span>
                    <button
                      type="button"
                      className="text-sm text-terracotta/80 hover:text-terracotta"
                      onClick={() => {
                        if (window.confirm(`Excluir "${sheet.name}"?`)) {
                          removeSheet(sheet.id);
                          toast.success("Ficha excluída.");
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FichaEditor({
  initial,
  onBack,
  onSave,
}: {
  initial: TechnicalSheet;
  onBack: () => void;
  onSave: (sheet: TechnicalSheet) => void;
}) {
  const { data: cadastros } = useCadastros();
  const [draft, setDraft] = useState(initial);
  const [pdfState, setPdfState] = useState<"idle" | "working">("idle");
  const dishes = cadastros?.dishes ?? [];
  const insumos = cadastros?.insumos ?? [];
  const cost = recipeCost(draft);
  const cmv = projectedCmv(draft);
  const perPortion = costPerPortion(draft);

  const update = <K extends keyof TechnicalSheet>(key: K, value: TechnicalSheet[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setIngredient = (id: string, patch: Partial<RecipeIngredient>) => {
    update(
      "ingredients",
      draft.ingredients.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const applyInsumo = (ingredientId: string, insumoId: string) => {
    const insumo = insumos.find((item) => item.id === insumoId);
    if (!insumo) {
      setIngredient(ingredientId, { insumoId: "" });
      return;
    }
    setIngredient(ingredientId, {
      insumoId: insumo.id,
      name: insumo.name,
      brand: insumo.brand || "",
      unit: insumo.unit || "g",
      unitCost: insumo.unitCost || 0,
      yieldPercent: insumo.yieldPercent || 100,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button type="button" className="text-sm font-light text-forest/60 hover:text-forest" onClick={onBack}>
            ← Voltar às fichas
          </button>
          <CadastrosHeader
            eyebrow="Cozinha"
            title={draft.name || "Ficha técnica"}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-10"
            disabled={pdfState === "working"}
            onClick={async () => {
              try {
                setPdfState("working");
                await downloadTechnicalSheetPdf(draft);
                toast.success("PDF da ficha baixado.");
              } catch (error) {
                console.error(error);
                toast.error("Não foi possível gerar o PDF.");
              } finally {
                setPdfState("idle");
              }
            }}
          >
            <FileDown data-icon="inline-start" />
            Exportar PDF
          </Button>
          <Button
            className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
            onClick={() => {
              if (!draft.name.trim()) {
                toast.error("Informe o nome do prato.");
                return;
              }
              onSave({ ...draft, updatedAt: new Date().toISOString() });
            }}
          >
            Salvar ficha
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Cabeçalho da receita" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Item (nome do prato)" className="sm:col-span-2">
            <input
              className={fieldControlClass}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field label="Prato do cardápio">
            <select
              className={fieldControlClass}
              value={draft.dishId}
              onChange={(event) => {
                const dish = dishes.find((item) => item.id === event.target.value);
                update("dishId", event.target.value);
                if (dish) {
                  setDraft((current) => ({
                    ...current,
                    dishId: dish.id,
                    name: current.name.trim() ? current.name : dish.name,
                    classification: current.classification || dish.category,
                  }));
                }
              }}
            >
              <option value="">Sem vínculo</option>
              {dishes.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Classificação da receita">
            <input
              className={fieldControlClass}
              value={draft.classification}
              onChange={(event) => update("classification", event.target.value)}
              list="dish-categories"
            />
            <datalist id="dish-categories">
              {(cadastros?.dishCategories ?? []).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Field>
          <Field label="Setor">
            <input
              className={fieldControlClass}
              value={draft.sector}
              onChange={(event) => update("sector", event.target.value)}
            />
          </Field>
          <Field label="Tamanho da porção">
            <input
              className={fieldControlClass}
              value={draft.portionSize}
              onChange={(event) => update("portionSize", event.target.value)}
              placeholder="Ex.: 1500 gramas / porções"
            />
          </Field>
          <Field label="Rendimento (peso)">
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className={fieldControlClass}
                value={draft.yieldWeight || ""}
                onChange={(event) => update("yieldWeight", Number(event.target.value) || 0)}
              />
              <select
                className={cn(fieldControlClass, "w-24")}
                value={draft.yieldWeightUnit}
                onChange={(event) => update("yieldWeightUnit", event.target.value)}
              >
                {RECIPE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Rendimento (porções)">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.yieldPortions || ""}
              onChange={(event) => update("yieldPortions", Number(event.target.value) || 0)}
            />
          </Field>
          <Field label="Preço de venda">
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldControlClass}
              value={draft.salePrice || ""}
              onChange={(event) => update("salePrice", Number(event.target.value) || 0)}
            />
          </Field>
          <Field label="Preço de custo (calculado)">
            <input className={fieldControlClass} value={formatBRL(cost)} readOnly />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Ingredientes"
          hint="Quantidade ajustada = quantidade líquida ÷ (% de aproveitamento / 100)."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-2 font-normal">Ingrediente / marca</th>
                <th className="field-label py-2 font-normal">Quantidade líquida</th>
                <th className="field-label py-2 font-normal">Un.</th>
                <th className="field-label py-2 font-normal">% aprov.</th>
                <th className="field-label py-2 font-normal">Quantidade ajustada</th>
                <th className="field-label py-2 font-normal">Custo un.</th>
                <th className="field-label py-2 font-normal">Custo total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {draft.ingredients.map((item) => (
                <tr key={item.id} className="border-b border-forest/5 align-top">
                  <td className="py-2 pr-2">
                    <select
                      className={cn(fieldControlClass, "mb-1 h-9")}
                      value={item.insumoId}
                      onChange={(event) => applyInsumo(item.id, event.target.value)}
                    >
                      <option value="">Insumo avulso</option>
                      {insumos.map((insumo) => (
                        <option key={insumo.id} value={insumo.id}>
                          {insumo.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={cn(fieldControlClass, "mb-1 h-9")}
                      value={item.name}
                      onChange={(event) => setIngredient(item.id, { name: event.target.value })}
                      placeholder="Ingrediente"
                    />
                    <input
                      className={cn(fieldControlClass, "h-9")}
                      value={item.brand}
                      onChange={(event) => setIngredient(item.id, { brand: event.target.value })}
                      placeholder="Marca"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(fieldControlClass, "h-9 w-24")}
                      value={item.netQuantity || ""}
                      onChange={(event) => setIngredient(item.id, { netQuantity: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={cn(fieldControlClass, "h-9 w-16")}
                      value={item.unit}
                      onChange={(event) => setIngredient(item.id, { unit: event.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={cn(fieldControlClass, "h-9 w-20")}
                      value={item.yieldPercent || ""}
                      onChange={(event) => setIngredient(item.id, { yieldPercent: Number(event.target.value) || 100 })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-forest/70">{formatDecimal(adjustedQuantity(item), 2)}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(fieldControlClass, "h-9 w-24")}
                      value={item.unitCost || ""}
                      onChange={(event) => setIngredient(item.id, { unitCost: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-forest/80">{formatBRL(ingredientTotal(item))}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      aria-label="Remover ingrediente"
                      className="flex size-9 items-center justify-center text-forest/35 hover:text-terracotta"
                      onClick={() => update("ingredients", draft.ingredients.filter((row) => row.id !== item.id))}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          className="mt-4 h-9"
          onClick={() => update("ingredients", [...draft.ingredients, blankRecipeIngredient(uid())])}
        >
          <Plus data-icon="inline-start" />
          Ingrediente
        </Button>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-forest/10 px-4 py-3">
            <p className="field-label">Custo total</p>
            <p className="mt-1 text-lg font-semibold text-forest">{formatBRL(cost)}</p>
          </div>
          <div className="rounded-xl border border-forest/10 px-4 py-3">
            <p className="field-label">Custo por porção</p>
            <p className="mt-1 text-lg font-semibold text-forest">{perPortion ? formatBRL(perPortion) : "—"}</p>
          </div>
          <div className="rounded-xl border border-forest/10 px-4 py-3">
            <p className="field-label">CMV projetado</p>
            <p className="mt-1 text-lg font-semibold text-forest">{formatDecimal(cmv, 1)}%</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Modo de preparo" />
        <textarea
          className={cn(fieldControlClass, "min-h-40 py-3")}
          value={draft.method}
          onChange={(event) => update("method", event.target.value)}
          placeholder="Passo a passo da receita."
        />
      </section>
    </div>
  );
}
