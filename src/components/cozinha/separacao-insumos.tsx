"use client";

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { useFichasTecnicas } from "@/components/cozinha/fichas-tecnicas-provider";
import {
  downloadCatalogSeparationPdf,
  downloadInsumoSeparationPdf,
} from "@/components/cozinha/insumos-separacao-pdf";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { dishSheetLinks, insumoListFromDishes, insumoNeedsForEvent } from "@/lib/cozinha/calc";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { formatLongDate } from "@/lib/dates";
import { guestTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

type SeparationSource = "ficha" | "cadastro";

export function SeparacaoInsumos() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: fichas, ready: fichasReady } = useFichasTecnicas();
  const [eventId, setEventId] = useState("");
  const [source, setSource] = useState<SeparationSource>("ficha");
  const [portions, setPortions] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const ready = eventsReady && cadReady && fichasReady;

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [events],
  );

  const event = useMemo(() => events.find((item) => item.id === eventId) ?? null, [events, eventId]);
  const defaultPortions = event ? guestTotal(event.guests) : 0;
  const selectedDishIds = event?.selectedDishIds ?? [];

  const links = useMemo(() => {
    if (!event || !cadastros || !fichas) return [];
    return dishSheetLinks(selectedDishIds, cadastros.dishes, fichas.sheets);
  }, [event, cadastros, fichas, selectedDishIds]);

  const catalogLines = useMemo(() => {
    if (!event || !cadastros) return [];
    return insumoListFromDishes(selectedDishIds, cadastros.dishes, cadastros.insumos);
  }, [event, cadastros, selectedDishIds]);

  const dishesWithoutSheet = useMemo(() => {
    if (!event || !cadastros) return [];
    const linked = new Set(links.map((link) => link.dishId));
    return cadastros.dishes
      .filter((dish) => selectedDishIds.includes(dish.id) && !linked.has(dish.id))
      .map((dish) => dish.name);
  }, [event, cadastros, selectedDishIds, links]);

  const dishesWithoutInsumos = useMemo(() => {
    if (!event || !cadastros) return [];
    return cadastros.dishes
      .filter((dish) => selectedDishIds.includes(dish.id) && (dish.insumoIds ?? []).length === 0)
      .map((dish) => dish.name);
  }, [event, cadastros, selectedDishIds]);

  const selectEvent = (id: string) => {
    setEventId(id);
    setPortions({});
    setNotes("");
  };

  const needs = useMemo(() => {
    if (!event || !cadastros) return [];
    return insumoNeedsForEvent({ links, portions, defaultPortions, insumos: cadastros.insumos });
  }, [event, cadastros, links, portions, defaultPortions]);

  const totalCost = needs.reduce((sum, need) => sum + need.totalCost, 0);

  const exportPdf = async () => {
    if (!event) return;
    try {
      setWorking(true);
      if (source === "cadastro") {
        await downloadCatalogSeparationPdf(event, catalogLines, notes);
      } else {
        await downloadInsumoSeparationPdf(event, needs, notes);
      }
      toast.success("PDF de separação baixado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setWorking(false);
    }
  };

  const canExport = source === "ficha" ? needs.length > 0 : catalogLines.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Cozinha"
        title="Separação de Insumos"
        description="Gere a lista de insumos do evento pela ficha técnica (com quantidade e custo) ou pelo cadastro do prato (lista com os pratos vinculados)."
      />

      {!ready ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Evento">
                <select className={fieldControlClass} value={eventId} onChange={(e) => selectEvent(e.target.value)}>
                  <option value="">Selecione o evento…</option>
                  {sortedEvents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.title || "Sem nome"} {item.date ? `· ${formatLongDate(item.date)}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Origem da lista">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm",
                      source === "ficha" ? "border-forest bg-forest text-cream" : "border-forest/15 text-forest/70",
                    )}
                    onClick={() => setSource("ficha")}
                  >
                    Ficha técnica
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm",
                      source === "cadastro" ? "border-forest bg-forest text-cream" : "border-forest/15 text-forest/70",
                    )}
                    onClick={() => setSource("cadastro")}
                  >
                    Cadastro do prato
                  </button>
                </div>
              </Field>
            </div>
          </section>

          {!event ? null : selectedDishIds.length === 0 ? (
            <EmptyBlock
              title="Nenhum prato no evento"
              description="Selecione pratos do cardápio na ficha do evento para gerar a lista de insumos."
            />
          ) : source === "ficha" && links.length === 0 ? (
            <EmptyBlock
              title="Nenhum prato com ficha técnica"
              description={
                dishesWithoutSheet.length
                  ? `Pratos sem ficha vinculada: ${dishesWithoutSheet.join(", ")}. Crie as fichas técnicas com o prato vinculado.`
                  : "Selecione pratos do catálogo na ficha do evento e crie as fichas técnicas correspondentes."
              }
            />
          ) : source === "cadastro" && catalogLines.length === 0 ? (
            <EmptyBlock
              title="Nenhum insumo no cadastro dos pratos"
              description={
                dishesWithoutInsumos.length
                  ? `Vincule insumos em Cadastros → Cardápio. Sem insumos: ${dishesWithoutInsumos.join(", ")}.`
                  : "Vincule insumos a cada prato em Cadastros → Cardápio."
              }
            />
          ) : (
            <>
              {source === "ficha" ? (
                <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
                  <SectionTitle
                    title="Porções por prato"
                    hint={`Padrão: ${defaultPortions} (total a servir). Ajuste se um prato não for para todos.`}
                  />
                  {dishesWithoutSheet.length > 0 ? (
                    <p className="mb-3 rounded-lg bg-terracotta/10 px-3 py-2 text-xs text-terracotta">
                      Sem ficha técnica: {dishesWithoutSheet.join(", ")}
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {links.map((link) => (
                      <Field key={link.dishId} label={link.dishName}>
                        <input
                          type="number"
                          min={0}
                          className={fieldControlClass}
                          value={portions[link.dishId] ?? defaultPortions}
                          onChange={(e) =>
                            setPortions((current) => ({ ...current, [link.dishId]: Number(e.target.value) || 0 }))
                          }
                        />
                        <span className="text-xs font-light text-forest/45">
                          Rende {formatDecimal(link.sheet.yieldPortions, 0)} porções por ficha
                        </span>
                      </Field>
                    ))}
                  </div>
                </section>
              ) : (
                dishesWithoutInsumos.length > 0 ? (
                  <p className="rounded-xl border border-forest/10 bg-white px-4 py-3 text-sm text-forest/60">
                    Pratos sem insumos no cadastro: {dishesWithoutInsumos.join(", ")}.
                  </p>
                ) : null
              )}

              <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle
                    title="Insumos a separar"
                    hint={
                      source === "cadastro"
                        ? "Lista a partir do cadastro do prato — sem quantidade calculada."
                        : undefined
                    }
                  />
                  <Button
                    className="h-9 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
                    disabled={working || !canExport}
                    onClick={() => void exportPdf()}
                  >
                    <FileDown data-icon="inline-start" />
                    Exportar PDF
                  </Button>
                </div>
                {source === "ficha" ? (
                  needs.length === 0 ? (
                    <p className="text-sm font-light text-forest/50">
                      As fichas destes pratos ainda não têm ingredientes cadastrados.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-forest/10">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-forest/10">
                            <th className="field-label py-2 pl-4 font-normal">Insumo</th>
                            <th className="field-label py-2 font-normal">Pratos</th>
                            <th className="field-label py-2 text-right font-normal">Quantidade</th>
                            <th className="field-label py-2 pr-4 text-right font-normal">Custo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {needs.map((need) => (
                            <tr key={need.key} className="border-b border-forest/5 last:border-0">
                              <td className="py-2 pl-4 font-list text-forest">{need.name}</td>
                              <td className="py-2 text-xs font-light text-forest/45">{need.dishes.join(", ")}</td>
                              <td className="py-2 text-right tabular-nums text-forest/80">
                                {formatDecimal(need.quantity, 2)} {need.unit}
                              </td>
                              <td className="py-2 pr-4 text-right text-forest/60">{formatBRL(need.totalCost)}</td>
                            </tr>
                          ))}
                          <tr className="bg-forest/[0.03]">
                            <td className="py-2 pl-4 font-medium text-forest" colSpan={3}>
                              Custo estimado total
                            </td>
                            <td className="py-2 pr-4 text-right font-medium text-forest">{formatBRL(totalCost)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="overflow-hidden rounded-xl border border-forest/10">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-forest/10">
                          <th className="field-label py-2 pl-4 font-normal">Insumo</th>
                          <th className="field-label py-2 font-normal">Unidade</th>
                          <th className="field-label py-2 pr-4 font-normal">Pratos vinculados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogLines.map((line) => (
                          <tr key={line.insumoId} className="border-b border-forest/5 last:border-0">
                            <td className="py-2 pl-4 font-list text-forest">{line.name}</td>
                            <td className="py-2 text-forest/60">{line.unit}</td>
                            <td className="py-2 pr-4 text-xs font-light text-forest/45">{line.dishes.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Field label="Observações para a cozinha" className="mt-4">
                  <textarea
                    className={cn(fieldControlClass, "min-h-20 py-2")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas que entram no PDF de separação."
                  />
                </Field>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
