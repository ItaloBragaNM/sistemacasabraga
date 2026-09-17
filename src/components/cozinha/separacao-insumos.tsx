"use client";

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { useFichasTecnicas } from "@/components/cozinha/fichas-tecnicas-provider";
import { downloadInsumoSeparationPdf } from "@/components/cozinha/insumos-separacao-pdf";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { dishSheetLinks, insumoNeedsForEvent } from "@/lib/cozinha/calc";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { formatLongDate } from "@/lib/dates";
import { guestTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SeparacaoInsumos() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: fichas, ready: fichasReady } = useFichasTecnicas();
  const [eventId, setEventId] = useState("");
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

  const links = useMemo(() => {
    if (!event || !cadastros || !fichas) return [];
    return dishSheetLinks(event.selectedDishIds ?? [], cadastros.dishes, fichas.sheets);
  }, [event, cadastros, fichas]);

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

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Cozinha"
        title="Separação de Insumos"
        description="Calcula os insumos de um evento a partir das fichas técnicas dos pratos selecionados e gera o PDF para a cozinha."
      />

      {!ready ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
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
          </section>

          {!event ? null : links.length === 0 ? (
            <EmptyBlock
              title="Nenhum prato com ficha técnica"
              description="Selecione pratos do catálogo na ficha do evento e crie as fichas técnicas correspondentes (com o prato vinculado) para calcular os insumos."
            />
          ) : (
            <>
              <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
                <SectionTitle
                  title="Porções por prato"
                  hint={`Padrão: ${defaultPortions} (total a servir). Ajuste se um prato não for para todos.`}
                />
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

              <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle title="Insumos a separar" />
                  <Button
                    className="h-9 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
                    disabled={working || needs.length === 0}
                    onClick={async () => {
                      try {
                        setWorking(true);
                        await downloadInsumoSeparationPdf(event, needs, notes);
                        toast.success("PDF de separação baixado.");
                      } catch (error) {
                        console.error(error);
                        toast.error("Não foi possível gerar o PDF.");
                      } finally {
                        setWorking(false);
                      }
                    }}
                  >
                    <FileDown data-icon="inline-start" />
                    Exportar PDF
                  </Button>
                </div>
                {needs.length === 0 ? (
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
