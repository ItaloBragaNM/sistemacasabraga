"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { useEvents } from "@/components/events/events-provider";
import { Button } from "@/components/ui/button";
import { exportToXlsx } from "@/lib/cadastros/xlsx";
import { computeBalances } from "@/lib/logistica/calc";
import { buildAllocationWeek } from "@/lib/logistica/alocacao";
import { formatInt } from "@/lib/crm/format";
import { isoDaysInRange, toIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

function addDaysIso(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + days));
}

export function PlanejamentoCompras() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady } = useLogistica();

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDaysIso(today, 30));

  const ready = eventsReady && cadReady && logReady;

  const allocation = useMemo(() => {
    if (!cadastros || !logistica) return null;
    const days = isoDaysInRange(from, to);
    if (days.length === 0) return null;
    const balances = computeBalances(logistica.movements);
    return buildAllocationWeek(events, cadastros, balances, days);
  }, [events, cadastros, logistica, from, to]);

  const shortages = allocation?.ruptures ?? [];
  const consideredEvents = allocation?.events ?? [];

  const handleExport = async () => {
    if (shortages.length === 0) return;
    const headers = ["Material", "Categoria", "Estoque atual", "Pico de demanda", "Comprar", "Unidade"];
    const body = shortages.map((row) => [
      row.name,
      row.category,
      row.stock,
      row.peak,
      row.shortage,
      row.unit,
    ]);
    try {
      await exportToXlsx(`planejamento-compras-${from}-a-${to}`, "Compras", headers, body);
      toast.success("Planejamento exportado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Logística"
        title="Planejamento de Compras"
        description="Cruza a demanda dos eventos do período com o estoque atual e sugere o que falta comprar."
        action={
          <Button variant="outline" className="h-10 px-3" onClick={handleExport} disabled={shortages.length === 0}>
            <Download data-icon="inline-start" />
            Exportar
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !cadastros || !logistica ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : (
        <>
          <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="De">
                <input type="date" className={fieldControlClass} value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="Até">
                <input type="date" className={fieldControlClass} value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
            <p className="mt-3 text-xs font-light text-forest/50">
              {consideredEvents.length} evento(s) no período. A sugestão usa o pico de demanda simultânea (materiais
              retornam após o evento).
            </p>
          </section>

          {shortages.length === 0 ? (
            <EmptyBlock
              title="Nada a comprar no período"
              description="O estoque atual cobre a demanda dos eventos nesta janela. Ajuste as datas para planejar mais à frente."
            />
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-md bg-terracotta/10 px-3 py-1.5 text-sm text-terracotta">
                <AlertTriangle className="size-4" />
                {shortages.length} material(is) precisam de compra
              </span>
              <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-forest/10">
                      <th className="field-label py-3 pl-5 font-normal">Material</th>
                      <th className="field-label py-3 text-right font-normal">Estoque</th>
                      <th className="field-label py-3 text-right font-normal">Pico</th>
                      <th className="field-label py-3 pr-5 text-right font-normal">Comprar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortages.map((row) => (
                      <tr key={row.materialId} className="border-b border-forest/5 last:border-0 bg-terracotta/[0.03]">
                        <td className="py-3 pl-5">
                          <p className="font-list text-forest">{row.name}</p>
                          <p className="text-xs font-light text-forest/40">{row.category}</p>
                        </td>
                        <td className="py-3 text-right tabular-nums text-forest/60">{formatInt(row.stock)}</td>
                        <td className="py-3 text-right tabular-nums text-forest/60">{formatInt(row.peak)}</td>
                        <td className="py-3 pr-5 text-right">
                          <span className={cn("font-medium tabular-nums text-terracotta")}>{formatInt(row.shortage)}</span>
                          <span className="ml-1 text-xs font-light text-forest/40">{row.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
