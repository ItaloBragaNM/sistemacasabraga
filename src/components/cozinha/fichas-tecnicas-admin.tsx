"use client";

import { FileDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { downloadTechnicalSheetPdf } from "@/components/cozinha/ficha-tecnica-pdf";
import { useFichasTecnicas } from "@/components/cozinha/fichas-tecnicas-provider";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented";
import { KpiCard, StatusPill } from "@/components/ui/status-pill";
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
  dishLinkError,
  RECIPE_UNITS,
  sheetDishIds,
  TECHNICAL_SHEET_KIND_HINTS,
  TECHNICAL_SHEET_KIND_LABELS,
  TECHNICAL_SHEET_KINDS,
  type RecipeIngredient,
  type TechnicalSheet,
  type TechnicalSheetKind,
} from "@/lib/fichas-tecnicas/types";
import { cn } from "@/lib/utils";

type KindFilter = "todas" | TechnicalSheetKind;

export function FichasTecnicasAdmin() {
  const { data, ready, upsertSheet, removeSheet } = useFichasTecnicas();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("todas");

  const sheets = [...(data?.sheets ?? [])].sort(
    (a, b) =>
      TECHNICAL_SHEET_KINDS.indexOf(a.kind) - TECHNICAL_SHEET_KINDS.indexOf(b.kind) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
  const visible = kindFilter === "todas" ? sheets : sheets.filter((item) => item.kind === kindFilter);
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
    <PageShell
      eyebrow="Cozinha"
      title="Fichas técnicas"
      actions={
          <Button
            className="px-5"
            onClick={() => {
              const kind = kindFilter === "todas" ? "completa" : kindFilter;
              const sheet = blankTechnicalSheet(uid(), kind);
              sheet.name = "Nova receita";
              upsertSheet(sheet);
              setEditingId(sheet.id);
            }}
          >
            <Plus data-icon="inline-start" />
            Nova ficha
          </Button>
      }
    >

      <SegmentedControl
        ariaLabel="Tipo de ficha"
        value={kindFilter}
        onChange={setKindFilter}
        options={[
          { value: "todas", label: "Todas" },
          { value: "base", label: "Bases" },
          { value: "recheio", label: "Recheios" },
          { value: "completa", label: "Completas" },
        ]}
      />

      {!ready ? (
        <LoadingBlock />
      ) : sheets.length === 0 ? (
        <EmptyBlock
          title="Nenhuma ficha técnica"
          description="Separe o que a cozinha produz em lote (base e recheio) da montagem final do prato."
        />
      ) : visible.length === 0 ? (
        <EmptyBlock
          title={
            kindFilter === "todas"
              ? "Nenhuma ficha técnica"
              : `Nenhuma ${TECHNICAL_SHEET_KIND_LABELS[kindFilter].toLowerCase()}`
          }
          description="Crie uma ficha neste tipo ou volte para Todas."
        />
      ) : (
        <Card flush>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="field-label py-3 pl-5 font-normal">Item</th>
                <th className="field-label py-3 font-normal">Tipo</th>
                <th className="field-label py-3 font-normal">Pratos</th>
                <th className="field-label py-3 text-right font-normal">Custo</th>
                <th className="field-label py-3 pl-6 text-right font-normal">CMV</th>
                <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((sheet) => (
                <tr key={sheet.id} className="border-b border-line align-middle last:border-0">
                  <td className="py-3 pl-5">
                    <p className="font-medium text-forest">{sheet.name}</p>
                    {sheet.sector ? <p className="meta-text">{sheet.sector}</p> : null}
                  </td>
                  <td className="py-3">
                    <StatusPill tone={sheet.kind === "completa" ? "ok" : "info"}>
                      {TECHNICAL_SHEET_KIND_LABELS[sheet.kind]}
                    </StatusPill>
                  </td>
                  <td className="py-3 text-forest/70">{sheetDishIds(sheet).length || "—"}</td>
                  <td className="py-3 text-right tabular text-forest/70">{formatBRL(recipeCost(sheet))}</td>
                  <td className="py-3 pl-6 text-right tabular text-forest/70">{formatDecimal(projectedCmv(sheet), 1)}%</td>
                  <td className="whitespace-nowrap py-3 pr-5 pl-4 text-right">
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
                      className="text-sm text-danger/80 hover:text-danger"
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
        </Card>
      )}
    </PageShell>
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
  const { data: fichas } = useFichasTecnicas();
  const [draft, setDraft] = useState(() => ({
    ...initial,
    kind: initial.kind ?? "completa",
    dishIds: sheetDishIds(initial),
    dishId: sheetDishIds(initial)[0] ?? "",
  }));
  const [pdfState, setPdfState] = useState<"idle" | "working">("idle");
  const dishes = [...(cadastros?.dishes ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const sheets = fichas?.sheets ?? [];
  const insumos = cadastros?.insumos ?? [];
  const linkedIds = sheetDishIds(draft);
  const previewSheets = sheets.map((item) => (item.id === draft.id ? draft : item));
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
    <PageShell
      width="wide"
      eyebrow="Cozinha"
      title={draft.name || "Ficha técnica"}
      back={
        <button type="button" className="text-sm text-forest/60 hover:text-forest" onClick={onBack}>
          ← Voltar às fichas
        </button>
      }
      actions={
        <>
          <Button
            variant="outline"
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
            className="px-5"
            onClick={() => {
              if (!draft.name.trim()) {
                toast.error("Informe o nome da ficha.");
                return;
              }
              onSave({
                ...draft,
                dishIds: sheetDishIds(draft),
                dishId: sheetDishIds(draft)[0] ?? "",
                updatedAt: new Date().toISOString(),
              });
            }}
          >
            Salvar ficha
          </Button>
        </>
      }
    >
      <Card>
        <SectionTitle title="Cabeçalho da receita" />
        <div className="mb-4">
          <p className="field-label mb-2">Tipo da ficha</p>
          <SegmentedControl
            ariaLabel="Tipo da ficha"
            value={draft.kind}
            onChange={(kind) => {
              const next = { ...draft, kind };
              const blocked = sheetDishIds(draft).find((dishId) =>
                dishLinkError(previewSheets, next, dishId),
              );
              if (blocked) {
                const dish = dishes.find((item) => item.id === blocked);
                toast.error(
                  `${dish?.name || "Um prato"} já tem outra ${TECHNICAL_SHEET_KIND_LABELS[kind].toLowerCase()}.`,
                );
                return;
              }
              update("kind", kind);
            }}
            options={[
              { value: "base", label: "Base" },
              { value: "recheio", label: "Recheio" },
              { value: "completa", label: "Completa" },
            ]}
          />
          <p className="meta-text mt-2">{TECHNICAL_SHEET_KIND_HINTS[draft.kind]}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome da ficha" className="sm:col-span-2">
            <input
              className={fieldControlClass}
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
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
            <input className={cn(fieldControlClass, "tabular bg-forest/[0.03]")} value={formatBRL(cost)} readOnly />
          </Field>
        </div>
        <div className="mt-5">
          <p className="field-label">Pratos do cardápio</p>
          <p className="meta-text mb-2">
            Cada prato pode ter até uma ficha de cada tipo (base, recheio e completa).
          </p>
          {dishes.length === 0 ? (
            <p className="meta-text rounded-lg border border-dashed border-line p-3">
              Cadastre pratos no cardápio para vinculá-los.
            </p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
              {dishes.map((dish) => {
                const checked = linkedIds.includes(dish.id);
                const error = dishLinkError(previewSheets, draft, dish.id);
                return (
                  <label
                    key={dish.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                      checked ? "bg-forest/8" : "hover:bg-forest/[0.03]",
                      error && !checked ? "opacity-55" : "",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="size-4 accent-forest"
                        checked={checked}
                        disabled={Boolean(error) && !checked}
                        onChange={() => {
                          if (!checked && error) {
                            toast.error(error);
                            return;
                          }
                          const dishIds = checked
                            ? linkedIds.filter((id) => id !== dish.id)
                            : [...linkedIds, dish.id];
                          setDraft((current) => ({
                            ...current,
                            dishIds,
                            dishId: dishIds[0] ?? "",
                            classification: current.classification || dish.category,
                          }));
                        }}
                      />
                      <span className="text-forest">{dish.name}</span>
                    </span>
                    <span className="meta-text">{error && !checked ? error : dish.category}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Ingredientes"
          hint="Quantidade ajustada = quantidade líquida ÷ (% de aproveitamento / 100)."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="field-label py-2 pr-2 font-normal">Ingrediente / marca</th>
                <th className="field-label py-2 pr-2 text-right font-normal">Qtd. líquida</th>
                <th className="field-label py-2 pr-2 font-normal">Un.</th>
                <th className="field-label py-2 pr-2 text-right font-normal">% aprov.</th>
                <th className="field-label py-2 pr-2 text-right font-normal">Qtd. ajustada</th>
                <th className="field-label py-2 pr-2 text-right font-normal">Custo un.</th>
                <th className="field-label py-2 pr-2 text-right font-normal">Custo total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {draft.ingredients.map((item) => (
                <tr key={item.id} className="border-b border-line align-top">
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
                      className={cn(fieldControlClass, "ml-auto block h-9 w-24 px-2 text-right tabular")}
                      value={item.netQuantity || ""}
                      onChange={(event) => setIngredient(item.id, { netQuantity: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className={cn(fieldControlClass, "h-9 w-16 px-2")}
                      value={item.unit}
                      onChange={(event) => setIngredient(item.id, { unit: event.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={cn(fieldControlClass, "ml-auto block h-9 w-20 px-2 text-right tabular")}
                      value={item.yieldPercent || ""}
                      onChange={(event) => setIngredient(item.id, { yieldPercent: Number(event.target.value) || 100 })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right leading-9 tabular text-forest/70">{formatDecimal(adjustedQuantity(item), 2)}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={cn(fieldControlClass, "ml-auto block h-9 w-24 px-2 text-right tabular")}
                      value={item.unitCost || ""}
                      onChange={(event) => setIngredient(item.id, { unitCost: Number(event.target.value) || 0 })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right leading-9 tabular text-forest/80">{formatBRL(ingredientTotal(item))}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      aria-label="Remover ingrediente"
                      className="flex size-9 items-center justify-center rounded-md text-forest/35 hover:text-danger"
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
          size="sm"
          className="mt-4"
          onClick={() => update("ingredients", [...draft.ingredients, blankRecipeIngredient(uid())])}
        >
          <Plus data-icon="inline-start" />
          Ingrediente
        </Button>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <KpiCard label="Custo total" value={formatBRL(cost)} />
          <KpiCard label="Custo por porção" value={perPortion ? formatBRL(perPortion) : "—"} />
          <KpiCard label="CMV projetado" value={`${formatDecimal(cmv, 1)}%`} />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Modo de preparo" />
        <textarea
          className={cn(fieldControlClass, "min-h-40 py-3")}
          value={draft.method}
          onChange={(event) => update("method", event.target.value)}
          placeholder="Passo a passo da receita."
        />
      </Card>
    </PageShell>
  );
}
