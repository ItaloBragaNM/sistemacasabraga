"use client";

import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import {
  downloadFleetWeekPdf,
  downloadVehicleWeekPdf,
  type VehicleWeekTrip,
} from "@/components/veiculos/registro-uso-pdf";
import { VEHICLE_KIND_LABELS, type VeiculoRecord } from "@/lib/cadastros/types";
import { formatShortDate, formatWeekRange, toIsoDate, weekDaysMonday } from "@/lib/dates";

export function RegistroUsoPage() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(() => new Date());
  const [workingId, setWorkingId] = useState<string | null>(null);

  const days = useMemo(() => weekDaysMonday(cursor), [cursor]);
  const weekStart = toIsoDate(days[0]);
  const weekEnd = toIsoDate(days[6]);
  const startLabel = format(days[0], "dd/MM/yyyy");
  const endLabel = format(days[6], "dd/MM/yyyy");

  const clientById = useMemo(
    () => new Map((cadastros?.clientes ?? []).map((item) => [item.id, item])),
    [cadastros],
  );

  const tripsByVehicle = useMemo(() => {
    const map = new Map<string, VehicleWeekTrip[]>();
    for (const event of events) {
      if (!event.date || event.status === "cancelado") continue;
      if (event.date < weekStart || event.date > weekEnd) continue;
      const route = [event.venue?.name, event.venue?.address].filter(Boolean).join(" · ");
      const trip: VehicleWeekTrip = {
        date: formatShortDate(event.date),
        timeOut: event.teamArrival || "",
        route,
        purpose: event.title || event.code,
        user: (event.clientId && clientById.get(event.clientId)?.name) || "",
      };
      for (const vehicleId of event.vehicleIds ?? []) {
        const list = map.get(vehicleId) ?? [];
        list.push(trip);
        map.set(vehicleId, list);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date, "pt-BR") || a.timeOut.localeCompare(b.timeOut));
    }
    return map;
  }, [events, weekStart, weekEnd, clientById]);

  const vehicles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(cadastros?.veiculos ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .filter((item) => {
        if (!term) return true;
        return `${item.name} ${item.plate} ${item.model}`.toLowerCase().includes(term);
      });
  }, [cadastros, search]);

  const downloadOne = async (vehicle: VeiculoRecord) => {
    try {
      setWorkingId(vehicle.id);
      await downloadVehicleWeekPdf(vehicle, weekStart, startLabel, endLabel, tripsByVehicle.get(vehicle.id) ?? []);
      toast.success("Registro semanal baixado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setWorkingId(null);
    }
  };

  const downloadAll = async () => {
    const fleet = cadastros?.veiculos ?? [];
    if (fleet.length === 0) return;
    try {
      setWorkingId("all");
      await downloadFleetWeekPdf(
        [...fleet]
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((vehicle) => ({ vehicle, trips: tripsByVehicle.get(vehicle.id) ?? [] })),
        weekStart,
        startLabel,
        endLabel,
      );
      toast.success("Registros da semana baixados.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setWorkingId(null);
    }
  };

  const loading = !eventsReady || !cadastrosReady;

  return (
    <PageShell
      eyebrow="Veículos"
      title="Registro de Uso"
      description="Cada PDF é a folha da semana daquele veículo. Os eventos em que ele está alocado entram na grade; quilometragem, chegada e visto ficam em branco para preencher à mão."
      actions={
        <Button
          variant="outline"
          className="h-10"
          disabled={loading || (cadastros?.veiculos.length ?? 0) === 0 || workingId !== null}
          onClick={() => void downloadAll()}
        >
          <FileDown data-icon="inline-start" />
          PDF da semana
        </Button>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (cadastros?.veiculos.length ?? 0) === 0 ? (
        <EmptyBlock
          title="Cadastre a frota"
          description="O cadastro dos veículos fica em Cadastros → Veículos. Cada um ganha uma folha semanal de utilização."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title tabular">{formatWeekRange(days[0], days[6])}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Semana anterior"
                className="flex size-9 items-center justify-center rounded-md text-forest/50 hover:bg-forest/5 hover:text-forest"
                onClick={() => setCursor((current) => addDays(current, -7))}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="h-9 rounded-md px-3 text-sm text-forest/60 hover:text-forest"
                onClick={() => setCursor(new Date())}
              >
                Esta semana
              </button>
              <button
                type="button"
                aria-label="Próxima semana"
                className="flex size-9 items-center justify-center rounded-md text-forest/50 hover:bg-forest/5 hover:text-forest"
                onClick={() => setCursor((current) => addDays(current, 7))}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por veículo ou placa…" />
          {vehicles.length === 0 ? (
            <EmptyBlock title="Nenhum veículo neste filtro" description="Ajuste a busca." />
          ) : (
            <Card flush>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="field-label py-3 pl-4 font-normal sm:pl-5">Veículo</th>
                    <th className="field-label px-3 py-3 font-normal">Usos na semana</th>
                    <th className="field-label py-3 pr-4 text-right font-normal sm:pr-5">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => {
                    const uses = tripsByVehicle.get(vehicle.id)?.length ?? 0;
                    return (
                      <tr key={vehicle.id} className="border-b border-line last:border-0">
                        <td className="py-3 pl-4 sm:pl-5">
                          <p className="font-medium text-forest">{vehicle.name}</p>
                          <p className="meta-text">
                            {vehicle.plate || "s/ placa"} · {VEHICLE_KIND_LABELS[vehicle.kind]}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-forest tabular">{uses === 0 ? "Nenhum evento" : uses}</td>
                        <td className="py-3 pr-4 sm:pr-5">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              className="h-9 px-3"
                              disabled={workingId !== null}
                              onClick={() => void downloadOne(vehicle)}
                            >
                              <FileDown data-icon="inline-start" />
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}
