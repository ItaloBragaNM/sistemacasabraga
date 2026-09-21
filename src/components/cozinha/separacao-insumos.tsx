"use client";

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { downloadCatalogSeparationPdf } from "@/components/cozinha/insumos-separacao-pdf";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { insumoListGroupedByDish } from "@/lib/cozinha/calc";
import { formatLongDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function SeparacaoInsumos() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const ready = eventsReady && cadReady;

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [events],
  );

  const event = useMemo(() => events.find((item) => item.id === eventId) ?? null, [events, eventId]);
  const selectedDishIds = event?.selectedDishIds ?? [];

  const catalogGroups = useMemo(() => {
    if (!event || !cadastros) return [];
    return insumoListGroupedByDish(selectedDishIds, cadastros.dishes, cadastros.insumos);
  }, [event, cadastros, selectedDishIds]);

  const dishesWithoutInsumos = useMemo(() => {
    if (!event || !cadastros) return [];
    return cadastros.dishes
      .filter((dish) => selectedDishIds.includes(dish.id) && (dish.insumoIds ?? []).length === 0)
      .map((dish) => dish.name);
  }, [event, cadastros, selectedDishIds]);

  const selectEvent = (id: string) => {
    setEventId(id);
    setNotes("");
  };

  const exportPdf = async () => {
    if (!event) return;
    try {
      setWorking(true);
      await downloadCatalogSeparationPdf(event, catalogGroups, notes);
      toast.success("PDF de separação baixado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader eyebrow="Cozinha" title="Separação de Insumos" />

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

          {!event ? null : selectedDishIds.length === 0 ? (
            <EmptyBlock
              title="Nenhum prato no evento"
              description="Selecione pratos do cardápio na ficha do evento para gerar a lista de insumos."
            />
          ) : catalogGroups.length === 0 ? (
            <EmptyBlock
              title="Nenhum insumo no cadastro dos pratos"
              description={
                dishesWithoutInsumos.length
                  ? `Vincule insumos em Cadastros → Cardápio. Sem insumos: ${dishesWithoutInsumos.join(", ")}.`
                  : "Vincule insumos a cada prato em Cadastros → Cardápio."
              }
            />
          ) : (
            <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <SectionTitle title="Insumos a separar" />
                <Button
                  className="h-9 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
                  disabled={working}
                  onClick={() => void exportPdf()}
                >
                  <FileDown data-icon="inline-start" />
                  Exportar PDF
                </Button>
              </div>
              {dishesWithoutInsumos.length > 0 ? (
                <p className="mb-4 rounded-xl border border-forest/10 bg-cream px-4 py-3 text-sm text-forest/60">
                  Pratos sem insumos no cadastro: {dishesWithoutInsumos.join(", ")}.
                </p>
              ) : null}
              <div className="space-y-5">
                {catalogGroups.map((group) => (
                  <div key={group.dishId} className="overflow-hidden rounded-xl border border-forest/10">
                    <p className="border-b border-forest/10 bg-forest/[0.03] px-4 py-2 text-sm font-medium text-forest">
                      {group.dishName}
                    </p>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-forest/10">
                          <th className="field-label py-2 pl-4 font-normal">Insumo</th>
                          <th className="field-label py-2 pr-4 font-normal">Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((line) => (
                          <tr key={line.insumoId} className="border-b border-forest/5 last:border-0">
                            <td className="py-2 pl-4 text-forest">{line.name}</td>
                            <td className="py-2 pr-4 text-forest/60">{line.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <Field label="Observações para a cozinha" className="mt-4">
                <textarea
                  className={cn(fieldControlClass, "min-h-20 py-2")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas que entram no PDF de separação."
                />
              </Field>
            </section>
          )}
        </>
      )}
    </div>
  );
}
