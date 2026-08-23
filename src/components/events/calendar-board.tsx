"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addMonths, addWeeks, format, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { StatusBadge } from "@/components/events/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDayHeading, formatMonthTitle, monthGrid, weekDays } from "@/lib/dates";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { EVENT_STATUSES, EVENT_TYPES, guestTotal, type EventRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewMode = "mes" | "semana" | "lista";

function eventsOnDay(events: EventRecord[], day: Date) {
  const key = format(day, "yyyy-MM-dd");
  return events
    .filter((event) => event.date === key)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function EventChip({ event }: { event: EventRecord }) {
  return (
    <Link
      href={`/eventos/${event.id}`}
      className={cn(
        "block rounded-md px-2 py-1.5 transition-colors",
        event.status === "cancelado"
          ? "bg-terracotta/10 text-terracotta"
          : "bg-forest text-cream hover:bg-petrol",
      )}
    >
      <p className="font-list truncate text-[0.7rem] font-medium">
        {event.startTime} · {event.title}
      </p>
      <p className="truncate text-[0.62rem] opacity-75">
        {EVENT_TYPE_LABELS[event.type]} · {guestTotal(event.guests)} pax
      </p>
    </Link>
  );
}

export function CalendarBoard({ events }: { events: EventRecord[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("mes");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [type, setType] = useState<string>("todos");

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const hay = `${event.title} ${event.code} ${event.client.name} ${event.venue.name}`.toLowerCase();
      const matchesQuery = hay.includes(query.trim().toLowerCase());
      const matchesStatus = status === "todos" || event.status === status;
      const matchesType = type === "todos" || event.type === type;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [events, query, status, type]);

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
          <p className="font-section text-[0.68rem] text-terracotta">Eventos</p>
          <h1 className="font-display mt-1 text-4xl tracking-tight text-forest sm:text-5xl">
            Calendário de Eventos
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light leading-6 text-forest/65">
            Visão da casa. Clique no evento para abrir a ficha operacional.
          </p>
        </div>
        <Link
          href="/eventos/novo"
          className={cn(buttonVariants(), "h-10 bg-forest px-4 text-cream hover:bg-petrol")}
        >
          <Plus data-icon="inline-start" />
          Novo evento
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-forest/10 bg-white/70 p-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome, cliente ou código"
          className="h-10 flex-1 border-forest/15 bg-cream"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-lg border border-forest/15 bg-cream px-3 text-sm"
        >
          <option value="todos">Todos os status</option>
          {EVENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {EVENT_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
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
          <h2 className="font-display ml-2 text-2xl capitalize text-forest">
            {view === "semana"
              ? `${format(weekDays(cursor)[0], "d MMM", { locale: ptBR })} — ${format(weekDays(cursor)[6], "d MMM yyyy", { locale: ptBR })}`
              : formatMonthTitle(cursor)}
          </h2>
        </div>
        <div className="flex rounded-lg border border-forest/15 bg-white p-1">
          {(["mes", "semana", "lista"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                "font-section rounded-md px-3 py-1.5 text-[0.62rem]",
                view === mode ? "bg-forest text-cream" : "text-forest/60",
              )}
            >
              {mode}
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
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <section key={date}>
                <h3 className="font-section mb-3 text-[0.7rem] text-forest/55">
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
                      <p className="font-list text-sm font-medium text-forest">
                        {event.startTime}–{event.endTime}
                      </p>
                      <div>
                        <p className="font-display text-2xl text-forest">{event.title}</p>
                        <p className="font-list mt-1 text-sm text-forest/55">
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
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <div className="grid grid-cols-7 border-b border-forest/10 bg-cream/80">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
              <p
                key={label}
                className="font-section px-2 py-3 text-center text-[0.62rem] text-forest/50"
              >
                {label}
              </p>
            ))}
          </div>
          <div className={`grid grid-cols-7 ${view === "semana" ? "min-h-[420px]" : ""}`}>
            {days.map((day) => {
              const dayEvents = eventsOnDay(filtered, day);
              const outside = view === "mes" && !isSameMonth(day, cursor);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[132px] border-r border-b border-forest/8 p-2 last:border-r-0",
                    outside && "bg-cream/40",
                    isToday(day) && "bg-terracotta/5",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "font-list flex size-7 items-center justify-center rounded-full text-xs",
                        isToday(day)
                          ? "bg-terracotta text-cream"
                          : outside
                            ? "text-forest/30"
                            : "text-forest",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="font-list text-[0.62rem] text-forest/40">
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
      <p className="font-display text-3xl text-forest">Nenhum evento neste recorte</p>
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
