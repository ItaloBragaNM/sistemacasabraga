"use client";

import { addMonths, format, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { VEHICLE_USAGE_CATEGORY_LABELS } from "@/lib/cadastros/types";
import { formatLongDate, formatMonthTitle, monthGrid } from "@/lib/dates";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { cn } from "@/lib/utils";

export function VeiculosUsoPage() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(() => new Date());
  const [missingSort, setMissingSort] = useState<DateSort>("asc");
  const [allocationSort, setAllocationSort] = useState<DateSort>("desc");

  const vehicles = cadastros?.veiculos;
  const vehicleById = useMemo(
    () => new Map((vehicles ?? []).map((item) => [item.id, item])),
    [vehicles],
  );

  const datedEvents = useMemo(
    () => events.filter((event) => event.date),
    [events],
  );
  const withoutVehicle = useMemo(
    () =>
      datedEvents
        .filter((event) => !(event.vehicleIds ?? []).length)
        .sort((a, b) => compareDateSort(a.date, b.date, missingSort)),
    [datedEvents, missingSort],
  );

  const days = useMemo(() => monthGrid(cursor), [cursor]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = events
      .filter((event) => (event.vehicleIds ?? []).length > 0)
      .flatMap((event) =>
        (event.vehicleIds ?? []).map((vehicleId) => ({
          event,
          vehicleId,
          vehicle: vehicleById.get(vehicleId),
        })),
      )
      .sort((a, b) => compareDateSort(a.event.date, b.event.date, allocationSort));
    if (!term) return list;
    return list.filter((row) => {
      const hay = [row.event.code, row.event.title, row.vehicle?.name, row.vehicle?.plate]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [events, search, vehicleById, allocationSort]);

  const loading = !eventsReady || !cadastrosReady;

  return (
    <PageShell eyebrow="Veículos" title="Agenda de Uso dos Veículos">
      {loading ? (
        <LoadingBlock />
      ) : (vehicles ?? []).length === 0 ? (
        <EmptyBlock
          title="Cadastre a frota"
          description="O cadastro dos veículos fica em Cadastros → Veículos. Depois, vincule-os na ficha do evento."
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title capitalize">{formatMonthTitle(cursor)}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Mês anterior"
                className="flex size-9 items-center justify-center rounded-md text-forest/50 hover:bg-forest/5 hover:text-forest"
                onClick={() => setCursor((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="h-9 rounded-md px-3 text-sm text-forest/60 hover:text-forest"
                onClick={() => setCursor(new Date())}
              >
                Hoje
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                className="flex size-9 items-center justify-center rounded-md text-forest/50 hover:bg-forest/5 hover:text-forest"
                onClick={() => setCursor((current) => addMonths(current, 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <Card flush>
            <div className="grid grid-cols-7 border-b border-line bg-cream/80">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
                <p key={label} className="field-label px-1 py-3 text-center text-forest/50 sm:px-2">
                  {label}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = datedEvents.filter((event) => event.date === key);
                const outside = !isSameMonth(day, cursor);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[118px] min-w-0 border-r border-b border-line p-1 last:border-r-0 sm:p-2",
                      outside && "bg-cream/40",
                      isToday(day) && "bg-forest/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-2 flex size-7 items-center justify-center rounded-md text-xs tabular",
                        isToday(day) ? "bg-forest text-cream" : outside ? "text-forest/30" : "text-forest",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="space-y-1">
                      {dayEvents.map((event) => {
                        const names = (event.vehicleIds ?? [])
                          .map((id) => vehicleById.get(id)?.name)
                          .filter(Boolean);
                        const missing = names.length === 0;
                        return (
                          <Link
                            key={event.id}
                            href={`/eventos/${event.id}`}
                            className={cn(
                              "block rounded-md px-1.5 py-1 text-[12px] leading-snug",
                              missing ? "bg-danger/10 text-danger" : "bg-forest/8 text-forest",
                            )}
                          >
                            <span className="block truncate font-medium">{event.title || "Evento"}</span>
                            <span className="block truncate opacity-80">
                              {missing ? "Sem veículo" : names.join(" · ")}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {withoutVehicle.length > 0 ? (
            <Card>
              <CardHeader
                title={<span className="text-danger">Eventos sem veículo</span>}
                actions={<DateSortSelect value={missingSort} onChange={setMissingSort} className="h-8" />}
              />
              <ul className="mt-3 space-y-2">
                {withoutVehicle.map((event) => (
                  <li key={event.id}>
                    <Link href={`/eventos/${event.id}`} className="text-sm text-forest hover:underline">
                      {event.date ? formatLongDate(event.date) : "Sem data"} · {event.title || "Evento sem nome"}
                      <span className="meta-text ml-2">{event.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[12rem] flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por evento, placa ou veículo…" />
            </div>
            <DateSortSelect value={allocationSort} onChange={setAllocationSort} />
          </div>
          {rows.length === 0 ? (
            <EmptyBlock
              title="Nenhum veículo alocado"
              description="Na ficha do evento, selecione o veículo. O registro semanal em PDF fica em Registro de Uso."
            />
          ) : (
            <Card flush>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="field-label py-3 pl-4 font-normal sm:pl-5">Evento</th>
                    <th className="field-label py-3 pr-4 pl-3 font-normal sm:pr-5">Veículo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = `${row.event.id}:${row.vehicleId}`;
                    return (
                      <tr key={key} className="border-b border-line last:border-0">
                        <td className="py-3 pl-4 align-top sm:pl-5">
                          <p className="font-medium text-forest">{row.event.title || "Evento sem nome"}</p>
                          <p className="meta-text">
                            {row.event.code} · {row.event.date ? formatLongDate(row.event.date) : "sem data"}
                            {row.event.outOfTown ? " · fora da cidade" : ""}
                          </p>
                        </td>
                        <td className="py-3 pr-4 pl-3 align-top sm:pr-5">
                          <p className="text-forest">{row.vehicle?.name || "Veículo removido"}</p>
                          <p className="meta-text">
                            {row.vehicle
                              ? `${row.vehicle.plate || "s/ placa"} · ${VEHICLE_USAGE_CATEGORY_LABELS[row.vehicle.usageCategory]}`
                              : row.vehicleId}
                          </p>
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
