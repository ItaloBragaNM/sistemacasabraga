"use client";

import { addMonths, format, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { Button } from "@/components/ui/button";
import { downloadVehicleChecklistPdf } from "@/components/veiculos/checklist-pdf";
import { useVeiculosUso } from "@/components/veiculos/veiculos-uso-provider";
import { VEHICLE_USAGE_CATEGORY_LABELS } from "@/lib/cadastros/types";
import { formatLongDate, formatMonthTitle, monthGrid } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function VeiculosUsoPage() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadastrosReady } = useCadastros();
  const { data, ready, markGenerated, markSigned } = useVeiculosUso();
  const [search, setSearch] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => new Date());

  const vehicles = cadastros?.veiculos;
  const usages = data?.usages;
  const vehicleById = useMemo(
    () => new Map((vehicles ?? []).map((item) => [item.id, item])),
    [vehicles],
  );
  const usageByKey = useMemo(
    () => new Map((usages ?? []).map((item) => [`${item.eventId}:${item.vehicleId}`, item])),
    [usages],
  );

  const datedEvents = useMemo(
    () => events.filter((event) => event.date),
    [events],
  );
  const withoutVehicle = useMemo(
    () =>
      datedEvents
        .filter((event) => !(event.vehicleIds ?? []).length)
        .sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [datedEvents],
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
          usage: usageByKey.get(`${event.id}:${vehicleId}`),
        })),
      )
      .sort((a, b) => (b.event.date || "").localeCompare(a.event.date || ""));
    if (!term) return list;
    return list.filter((row) => {
      const hay = [row.event.code, row.event.title, row.vehicle?.name, row.vehicle?.plate]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [events, search, usageByKey, vehicleById]);

  const loading = !eventsReady || !cadastrosReady || !ready;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader eyebrow="Veículos" title="Controle de uso" />

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
            <h2 className="text-[15px] font-semibold capitalize text-forest">{formatMonthTitle(cursor)}</h2>
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

          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
            <div className="grid grid-cols-7 border-b border-forest/10 bg-cream/80">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
                <p key={label} className="px-2 py-3 text-center text-[13px] font-medium text-forest/50">
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
                      "min-h-[118px] border-r border-b border-forest/8 p-2 last:border-r-0",
                      outside && "bg-cream/40",
                      isToday(day) && "bg-forest/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-2 flex size-7 items-center justify-center rounded-md text-xs",
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
                              missing ? "bg-terracotta/10 text-terracotta" : "bg-forest/8 text-forest",
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
          </div>

          {withoutVehicle.length > 0 ? (
            <section className="rounded-2xl border border-terracotta/20 bg-terracotta/5 p-4">
              <h2 className="text-[15px] font-semibold text-terracotta">Eventos sem veículo</h2>
              <ul className="mt-3 space-y-2">
                {withoutVehicle.map((event) => (
                  <li key={event.id}>
                    <Link href={`/eventos/${event.id}`} className="text-sm text-forest hover:underline">
                      {event.date ? formatLongDate(event.date) : "Sem data"} · {event.title || "Evento sem nome"}
                      <span className="ml-2 text-forest/45">{event.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por evento, placa ou veículo…" />
          {rows.length === 0 ? (
            <EmptyBlock
              title="Nenhum veículo alocado"
              description="Na ficha do evento, selecione o veículo como recurso. O checklist fica disponível aqui."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="field-label py-3 pl-5 font-normal">Evento</th>
                    <th className="field-label py-3 font-normal">Veículo</th>
                    <th className="field-label py-3 font-normal">Checklist</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = `${row.event.id}:${row.vehicleId}`;
                    return (
                      <tr key={key} className="border-b border-forest/5 last:border-0">
                        <td className="py-3 pl-5">
                          <p className="font-medium text-forest">{row.event.title || "Evento sem nome"}</p>
                          <p className="text-xs font-light text-forest/45">
                            {row.event.code} · {row.event.date ? formatLongDate(row.event.date) : "sem data"}
                            {row.event.outOfTown ? " · fora da cidade" : ""}
                          </p>
                        </td>
                        <td className="py-3">
                          <p className="text-forest">{row.vehicle?.name || "Veículo removido"}</p>
                          <p className="text-xs font-light text-forest/45">
                            {row.vehicle
                              ? `${row.vehicle.plate || "s/ placa"} · ${VEHICLE_USAGE_CATEGORY_LABELS[row.vehicle.usageCategory]}`
                              : row.vehicleId}
                          </p>
                        </td>
                        <td className="py-3">
                          {row.usage ? (
                            <Chip
                              className={
                                row.usage.status === "assinado"
                                  ? "bg-forest/10 text-forest"
                                  : "bg-terracotta/10 text-terracotta"
                              }
                            >
                              {row.usage.status === "assinado" ? "Assinado" : "PDF gerado"}
                            </Chip>
                          ) : (
                            <span className="text-forest/40">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 pr-5">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="h-9 px-3"
                              disabled={!row.vehicle || workingId === key}
                              onClick={async () => {
                                if (!row.vehicle) return;
                                try {
                                  setWorkingId(key);
                                  await downloadVehicleChecklistPdf(row.event, row.vehicle);
                                  markGenerated(row.event.id, row.vehicle.id);
                                  toast.success("Checklist baixado para preenchimento e assinatura.");
                                } catch (error) {
                                  console.error(error);
                                  toast.error("Não foi possível gerar o PDF.");
                                } finally {
                                  setWorkingId(null);
                                }
                              }}
                            >
                              <FileDown data-icon="inline-start" />
                              PDF
                            </Button>
                            {row.usage && row.usage.status !== "assinado" ? (
                              <Button
                                className="h-9 bg-forest px-3 text-cream hover:bg-petrol"
                                onClick={() => {
                                  markSigned(row.usage!.id);
                                  toast.success("Checklist marcado como assinado.");
                                }}
                              >
                                Assinado
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
