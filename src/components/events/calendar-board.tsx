"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addMonths, addWeeks, format, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { StatusBadge } from "@/components/events/status-badge";
import { fieldControlClass } from "@/components/events/field";
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

function EventChip({ event }: { event: EventRecord }) {
  return (
    <Link
      href={`/eventos/${event.id}`}
      className={cn(
        "block rounded-md px-2 py-1.5 transition-colors hover:opacity-90",
        `cal-chip-${event.status}`,
      )}
    >
      <p className="truncate text-[13px] font-medium">
        {event.ceremonyTime || event.invitationTime || event.serviceTime || "—"} · {event.title}
      </p>
      <p className="truncate text-[13px] opacity-80">
        {EVENT_TYPE_LABELS[event.type]} · {guestTotal(event.guests)} pax
      </p>
    </Link>
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
  const [type, setType] = useState<string>("todos");

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const clientName = event.clientId ? (clientNames.get(event.clientId) ?? "") : "";
      const hay = `${event.title} ${event.code} ${event.venue.name} ${event.venue.address} ${clientName}`.toLowerCase();
      const matchesQuery = hay.includes(query.trim().toLowerCase());
      const matchesStatus = statuses.length === 0 || statuses.includes(event.status);
      const matchesType = type === "todos" || event.type === type;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [events, query, statuses, type, clientNames]);

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-forest/50">Eventos</p>
          <h1 className="page-title mt-1">
            Calendário de Eventos
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light leading-6 text-forest/65">
            Visão da casa. Clique no evento para abrir a ficha operacional. As cores seguem o
            status da ficha.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EVENT_STATUSES.map((item) => (
              <span
                key={item}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px]",
                  `cal-chip-${item}`,
                )}
              >
                {EVENT_STATUS_LABELS[item]}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/eventos/novo"
          className={cn(buttonVariants(), "h-10 bg-forest px-4 text-cream hover:bg-petrol")}
        >
          <Plus data-icon="inline-start" />
          Novo evento
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-forest/10 bg-white p-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, cliente ou código"
          className={cn(fieldControlClass, "flex-1 bg-cream")}
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm",
              statuses.length === 0 ? "border-forest bg-forest text-cream" : "border-forest/15 text-forest/70",
            )}
            onClick={() => setStatuses([])}
          >
            Todos os status
          </button>
          {EVENT_STATUSES.map((item) => {
            const active = statuses.includes(item);
            return (
              <button
                key={item}
                type="button"
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  active ? "border-forest bg-forest text-cream" : "border-forest/15 text-forest/70",
                )}
                onClick={() =>
                  setStatuses((current) =>
                    current.includes(item) ? current.filter((status) => status !== item) : [...current, item],
                  )
                }
              >
                {EVENT_STATUS_LABELS[item]}
              </button>
            );
          })}
        </div>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 rounded-lg border border-forest/15 bg-cream px-3 text-sm"
        >
          <option value="todos">Todos os tipos</option>
          {EVENT_TYPES.map((item) => (
            <option key={item} value={item}>
              {EVENT_TYPE_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCursor(new Date())}
          >
            Hoje
          </Button>
          <h2 className="ml-2 text-[15px] font-semibold capitalize text-forest">
            {view === "semana"
              ? `${format(weekDays(cursor)[0], "d MMM", { locale: ptBR })} — ${format(weekDays(cursor)[6], "d MMM yyyy", { locale: ptBR })}`
              : formatMonthTitle(cursor)}
          </h2>
        </div>
        <div className="flex rounded-lg border border-forest/15 bg-white p-1">
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
                "cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium",
                view === mode ? "bg-forest text-cream" : "text-forest/60 hover:text-forest",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "lista" ? (
        <div className="space-y-8">
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
                <h3 className="mb-3 text-[13px] font-medium text-forest/55">
                  {formatDayHeading(new Date(`${date}T12:00:00`))}
                </h3>
                <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
                  {dayEvents.map((event, index) => (
                    <Link
                      key={event.id}
                      href={`/eventos/${event.id}`}
                      className={cn(
                        "grid gap-3 px-4 py-4 transition-colors hover:bg-cream sm:grid-cols-[90px_1fr_auto] sm:items-center",
                        index > 0 && "border-t border-forest/8",
                      )}
                    >
                      <p className="text-sm font-medium text-forest">
                        {event.invitationTime || "—"}
                        {event.serviceTime ? ` · srv ${event.serviceTime}` : ""}
                      </p>
                      <div>
                        <p className="text-[15px] font-semibold text-forest">{event.title}</p>
                        <p className="mt-1 text-sm text-forest/55">
                          {EVENT_TYPE_LABELS[event.type]} · {event.venue.name} ·{" "}
                          {guestTotal(event.guests)} pax · {event.code}
                        </p>
                      </div>
                      <StatusBadge status={event.status} />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : view === "semana" ? (
        <div className="space-y-3">
          {days.map((day) => {
            const dayEvents = eventsOnDay(filtered, day);
            return (
              <section
                key={day.toISOString()}
                className={cn(
                  "rounded-2xl border border-forest/10 bg-white p-4",
                  isToday(day) && "border-terracotta/40 bg-terracotta/5",
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[13px] font-medium text-forest/60">
                    {formatDayHeading(day)}
                  </h3>
                  {isToday(day) && (
                    <span className="text-[13px] font-medium text-forest/50">Hoje</span>
                  )}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-sm font-light text-forest/40">Sem eventos neste dia.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
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
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <div className="grid grid-cols-7 border-b border-forest/10 bg-cream/80">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
              <p
                key={label}
                className="px-2 py-3 text-center text-[13px] font-medium text-forest/50"
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
                    "min-h-[132px] border-r border-b border-forest/8 p-2 last:border-r-0",
                    outside && "bg-cream/40",
                    isToday(day) && "bg-forest/5",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md text-xs",
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
                      <span className="text-[13px] text-forest/40">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
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
    <div className="px-6 py-16 text-center">
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
