"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addMonths, addWeeks, format, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, FileDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { FilterMultiSelect } from "@/components/cadastros/ui";
import { fieldControlClass } from "@/components/events/field";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { StatusBadge } from "@/components/events/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { formatDayHeading, formatMonthTitle, monthGrid, weekDays } from "@/lib/dates";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { EVENT_STATUSES, EVENT_TYPES, guestTotal, type EventRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewMode = "mes" | "semana" | "lista";

function eventsOnDay(events: EventRecord[], day: Date) {
  const key = format(day, "yyyy-MM-dd");
  return events
    .filter((event) => event.date === key)
    .sort((a, b) =>
      (a.invitationTime || a.serviceTime).localeCompare(b.invitationTime || b.serviceTime),
    );
}

function PdfButton({ event }: { event: EventRecord }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Baixar PDF de ${event.title || event.code}`}
      title="Baixar PDF da cozinha"
      className="flex size-5 shrink-0 items-center justify-center rounded text-current opacity-75 hover:opacity-100"
      onClick={async (click) => {
        click.preventDefault();
        click.stopPropagation();
        if (busy) return;
        setBusy(true);
        try {
          await downloadKitchenPdf(event);
          toast.success("PDF da cozinha baixado.");
        } catch (error) {
          console.error(error);
          toast.error("Não foi possível gerar o PDF.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <FileDown className="size-3" />
    </button>
  );
}

function EventChip({ event }: { event: EventRecord }) {
  return (
    <div className={cn("flex items-start gap-0.5 rounded-md pr-0.5", `cal-chip-${event.status}`)}>
      <Link href={`/eventos/${event.id}`} className="min-w-0 flex-1 px-1.5 py-0.5 transition-colors hover:opacity-90">
        <p className="truncate text-[10px] font-medium leading-tight">
          {event.ceremonyTime || event.invitationTime || event.serviceTime || "—"} · {event.title}
        </p>
      </Link>
      <PdfButton event={event} />
    </div>
  );
}

export function CalendarBoard({ events }: { events: EventRecord[] }) {
  const { data: cadastros } = useCadastros();
  const clientNames = useMemo(
    () => new Map((cadastros?.clientes ?? []).map((cliente) => [cliente.id, cliente.name])),
    [cadastros],
  );
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("mes");
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const clientName = event.clientId ? (clientNames.get(event.clientId) ?? "") : "";
      const hay = `${event.title} ${event.code} ${event.venue.name} ${event.venue.address} ${clientName}`.toLowerCase();
      const matchesQuery = hay.includes(query.trim().toLowerCase());
      const matchesStatus = statuses.length === 0 || statuses.includes(event.status);
      const matchesType = types.length === 0 || types.includes(event.type);
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [events, query, statuses, types, clientNames]);

  const days = view === "mes" ? monthGrid(cursor) : weekDays(cursor);
  const listDays = useMemo(() => {
    const unique = [...new Set(filtered.map((event) => event.date))].sort();
    return unique;
  }, [filtered]);

  const shift = (direction: number) => {
    if (view === "semana") setCursor((current) => addWeeks(current, direction));
    else setCursor((current) => addMonths(current, direction));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-forest/50">Eventos</p>
          <h1 className="page-title mt-0.5">Calendário de Eventos</h1>
        </div>
        <Link
          href="/eventos/novo"
          className={cn(buttonVariants(), "h-9 bg-forest px-4 text-cream hover:bg-petrol")}
        >
          <Plus data-icon="inline-start" />
          Novo evento
        </Link>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-forest/10 bg-white p-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, cliente ou código"
          className={cn(fieldControlClass, "h-9 flex-1 bg-cream")}
        />
        <FilterMultiSelect
          value={statuses}
          onChange={setStatuses}
          emptyLabel="Todos os status"
          countedNoun="status"
          options={EVENT_STATUSES.map((item) => ({ key: item, label: EVENT_STATUS_LABELS[item] }))}
        />
        <FilterMultiSelect
          value={types}
          onChange={setTypes}
          emptyLabel="Todos os tipos"
          countedNoun="tipos"
          options={EVENT_TYPES.map((item) => ({ key: item, label: EVENT_TYPE_LABELS[item] }))}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="size-8" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button variant="outline" className="h-8 px-3 text-[13px]" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <h2 className="ml-1 text-sm font-semibold capitalize text-forest">
            {view === "semana"
              ? `${format(weekDays(cursor)[0], "d MMM", { locale: ptBR })} — ${format(weekDays(cursor)[6], "d MMM yyyy", { locale: ptBR })}`
              : formatMonthTitle(cursor)}
          </h2>
        </div>
        <div className="flex rounded-lg border border-forest/15 bg-white p-0.5">
          {(
            [
              ["mes", "Mês"],
              ["semana", "Semana"],
              ["lista", "Lista"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium",
                view === mode ? "bg-forest text-cream" : "text-forest/60 hover:text-forest",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-forest/65">
        {EVENT_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", `cal-chip-${status}`)} />
            {EVENT_STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {view === "lista" ? (
        <div className="space-y-6">
          {listDays.length === 0 && (
            <EmptyState />
          )}
          {listDays.map((date) => {
            const dayEvents = filtered
              .filter((event) => event.date === date)
              .sort((a, b) =>
                (a.invitationTime || a.serviceTime).localeCompare(
                  b.invitationTime || b.serviceTime,
                ),
              );
            return (
              <section key={date}>
                <h3 className="mb-2 text-[13px] font-medium text-forest/55">
                  {formatDayHeading(new Date(`${date}T12:00:00`))}
                </h3>
                <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
                  {dayEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className={cn(
                        "grid gap-3 px-4 py-3 sm:grid-cols-[90px_1fr_auto] sm:items-center",
                        index > 0 && "border-t border-forest/8",
                      )}
                    >
                      <p className="text-sm font-medium text-forest">
                        {event.invitationTime || "—"}
                        {event.serviceTime ? ` · serviço ${event.serviceTime}` : ""}
                      </p>
                      <Link href={`/eventos/${event.id}`} className="min-w-0 hover:opacity-80">
                        <p className="text-[15px] font-semibold text-forest">{event.title}</p>
                        <p className="mt-1 text-sm text-forest/55">
                          {EVENT_TYPE_LABELS[event.type]} · {event.venue.name} ·{" "}
                          {guestTotal(event.guests)} pessoas · {event.code}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.status} />
                        <Button
                          type="button"
                          variant="outline"
                          className="size-8 p-0"
                          aria-label={`Baixar PDF de ${event.title || event.code}`}
                          onClick={async () => {
                            try {
                              await downloadKitchenPdf(event);
                              toast.success("PDF da cozinha baixado.");
                            } catch (error) {
                              console.error(error);
                              toast.error("Não foi possível gerar o PDF.");
                            }
                          }}
                        >
                          <FileDown className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : view === "semana" ? (
        <div className="space-y-2">
          {days.map((day) => {
            const dayEvents = eventsOnDay(filtered, day);
            return (
              <section
                key={day.toISOString()}
                className={cn(
                  "rounded-xl border border-forest/10 bg-white p-3",
                  isToday(day) && "border-terracotta/40 bg-terracotta/5",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-forest/60">
                    {formatDayHeading(day)}
                  </h3>
                  {isToday(day) && (
                    <span className="text-[12px] font-medium text-forest/50">Hoje</span>
                  )}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-sm font-light text-forest/40">Sem eventos neste dia.</p>
                ) : (
                  <div className="grid gap-1.5 md:grid-cols-2">
                    {dayEvents.map((event) => (
                      <EventChip key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-forest/10 bg-white">
          <div className="grid grid-cols-7 border-b border-forest/10 bg-cream/80">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
              <p
                key={label}
                className="px-1 py-1.5 text-center text-[11px] font-medium text-forest/50"
              >
                {label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEvents = eventsOnDay(filtered, day);
              const outside = !isSameMonth(day, cursor);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[68px] border-r border-b border-forest/8 p-1 last:border-r-0",
                    outside && "bg-cream/40",
                    isToday(day) && "bg-forest/5",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded text-[10px]",
                        isToday(day)
                          ? "bg-forest text-cream"
                          : outside
                            ? "text-forest/30"
                            : "text-forest",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-forest/40">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.map((event) => (
                      <EventChip key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="border-t border-forest/8">
              <EmptyState />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-forest">Nenhum evento neste recorte</p>
      <p className="mt-2 text-sm font-light text-forest/55">
        Ajuste os filtros ou crie um novo evento para a casa.
      </p>
      <Link
        href="/eventos/novo"
        className={cn(buttonVariants(), "mt-5 bg-forest text-cream hover:bg-petrol")}
      >
        Novo evento
      </Link>
    </div>
  );
}
