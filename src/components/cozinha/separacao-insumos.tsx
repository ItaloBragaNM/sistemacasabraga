"use client";

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { downloadCatalogSeparationPdf } from "@/components/cozinha/insumos-separacao-pdf";
import { EventCalendar } from "@/components/events/event-calendar";
import { useEvents } from "@/components/events/events-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { insumoListGroupedByDish } from "@/lib/cozinha/calc";
import { formatLongDate } from "@/lib/dates";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function SeparacaoInsumos() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const ready = eventsReady && cadReady;

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...events]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .filter((item) => {
        if (!term) return true;
        return (
          item.title.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term) ||
          EVENT_TYPE_LABELS[item.type].toLowerCase().includes(term) ||
          item.venue.name.toLowerCase().includes(term)
        );
      });
  }, [events, search]);

  const event = useMemo(() => events.find((item) => item.id === eventId) ?? null, [events, eventId]);
  const selectedDishIds = useMemo(() => event?.selectedDishIds ?? [], [event]);

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
    <PageShell width="wide" eyebrow="Cozinha" title="Separação de Insumos">

      {!ready ? (
        <LoadingBlock />
      ) : events.length === 0 ? (
        <EmptyBlock
          title="Nenhum evento"
          description="Crie um relatório de evento para separar insumos."
        />
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar evento…" />
          {filteredEvents.length === 0 ? (
            <EmptyBlock
              title="Nenhum evento encontrado"
              description="Ajuste a busca ou mude o mês para localizar o relatório."
            />
          ) : (
            <EventCalendar
              events={filteredEvents}
              selectedId={eventId}
              onSelect={(item) => selectEvent(item.id)}
              emptyDescription="Mude o mês ou a busca para localizar o relatório."
            />
          )}
          {event ? (
            <p className="meta-text">
              Selecionado: {event.code} · {event.title || "Sem nome"}
              {event.date ? ` · ${formatLongDate(event.date)}` : ""}
            </p>
          ) : (
            <p className="meta-text">Clique em um evento no calendário para ver os insumos.</p>
          )}

          {!event ? null : selectedDishIds.length === 0 ? (
            <EmptyBlock
              title="Nenhum prato no evento"
              description="Selecione pratos do cardápio no relatório do evento para gerar a lista de insumos."
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
            <Card>
              <CardHeader
                className="mb-4 border-b border-line pb-3"
                title="Insumos a separar"
                actions={
                  <Button className="px-4" disabled={working} onClick={() => void exportPdf()}>
                    <FileDown data-icon="inline-start" />
                    Exportar PDF
                  </Button>
                }
              />
              {dishesWithoutInsumos.length > 0 ? (
                <p className="mb-4 rounded-lg border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
                  Pratos sem insumos no cadastro: {dishesWithoutInsumos.join(", ")}.
                </p>
              ) : null}
              <div className="space-y-5">
                {catalogGroups.map((group) => (
                  <div key={group.dishId} className="overflow-hidden rounded-lg border border-line">
                    <p className="group-title border-b border-line bg-forest/[0.03] px-4 py-2">
                      {group.dishName}
                    </p>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="field-label py-2 pl-4 font-normal">Insumo</th>
                          <th className="field-label w-28 py-2 pr-4 text-right font-normal">Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((line) => (
                          <tr key={line.insumoId} className="border-b border-line last:border-0">
                            <td className="py-2 pl-4 text-forest">{line.name}</td>
                            <td className="py-2 pr-4 text-right text-forest/60">{line.unit}</td>
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
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}
