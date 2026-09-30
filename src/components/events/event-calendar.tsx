"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addMonths, addWeeks, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyBlock } from "@/components/cadastros/ui";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { MonthCalendarGrid } from "@/components/events/month-calendar-grid";
import { StatusBadge } from "@/components/events/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDayHeading, formatMonthTitle, formatShortDate, monthGrid, weekDays } from "@/lib/dates";
import { EVENT_STATUS_LABELS } from "@/lib/labels";
import { EVENT_STATUSES, type EventRecord } from "@/lib/types";
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

function EventChip({
  event,
  href,
  selected,
  onSelect,
  roomy = false,
  marked,
}: {
  event: EventRecord;
  href?: string;
  selected?: boolean;
  onSelect?: (event: EventRecord) => void;
  roomy?: boolean;
  marked?: boolean;
}) {
  const label = `${event.ceremonyTime || event.invitationTime || event.serviceTime || "—"} · ${event.title || "Evento sem nome"}`;
  const className = cn(
    "block min-w-0 truncate rounded-md font-medium transition-colors hover:opacity-90",
    `cal-chip-${event.status}`,
    roomy ? "px-2.5 py-1.5 text-[13px] leading-5" : "px-2 py-1 text-[12px] leading-4",
    selected && "ring-2 ring-forest ring-offset-1",
  );

  const inner = marked ? `${label} · ruptura` : label;

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={cn(className, "w-full text-left")} onClick={() => onSelect?.(event)}>
      {inner}
    </button>
  );
}

export function EventCalendar({
  events,
  hrefForEvent,
  onSelect,
  selectedId,
  emptyTitle = "Nenhum evento neste recorte",
  emptyDescription = "Ajuste os filtros ou mude o mês para localizar o relatório.",
  badge,
  marked,
  fill = false,
}: {
  events: EventRecord[];
  hrefForEvent?: (event: EventRecord) => string;
  onSelect?: (event: EventRecord) => void;
  selectedId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  badge?: (event: EventRecord) => React.ReactNode;
  marked?: (event: EventRecord) => boolean;
  fill?: boolean;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("mes");
  const [dateSort, setDateSort] = useState<DateSort>("asc");

  const dated = useMemo(() => events.filter((event) => event.date), [events]);
  const undated = useMemo(() => events.filter((event) => !event.date), [events]);
  const days = view === "mes" ? monthGrid(cursor) : weekDays(cursor);
  const listDays = useMemo(() => {
    return [...new Set(dated.map((event) => event.date))].sort((a, b) => compareDateSort(a, b, dateSort));
  }, [dated, dateSort]);

  const periodLabel =
    view === "semana"
      ? `${format(weekDays(cursor)[0], "d MMM", { locale: ptBR })} — ${format(weekDays(cursor)[6], "d MMM yyyy", { locale: ptBR })}`
      : formatMonthTitle(cursor);

  const shift = (direction: number) => {
    if (view === "semana") setCursor((current) => addWeeks(current, direction));
    else setCursor((current) => addMonths(current, direction));
  };

  const renderChip = (event: EventRecord, roomy?: boolean) => (
    <EventChip
      key={event.id}
      event={event}
      href={hrefForEvent?.(event)}
      selected={selectedId === event.id}
      onSelect={onSelect}
      roomy={roomy}
      marked={marked?.(event)}
    />
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        fill
          ? "min-h-0 flex-1"
          : "h-[22rem] min-h-[18rem]",
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label="Período anterior" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Próximo período" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <h2 className="section-title ml-1 capitalize">{periodLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === "lista" ? <DateSortSelect value={dateSort} onChange={setDateSort} /> : null}
          <SegmentedControl<ViewMode>
            ariaLabel="Visão do calendário"
            value={view}
            onChange={setView}
            options={[
              { value: "mes", label: "Mês" },
              { value: "semana", label: "Semana" },
              { value: "lista", label: "Lista" },
            ]}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/65">
        {EVENT_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", `cal-chip-${status}`)} />
            {EVENT_STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {view === "lista" ? (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          {listDays.length === 0 ? (
            <EmptyBlock title={emptyTitle} description={emptyDescription} />
          ) : (
            listDays.map((date) => {
              const dayEvents = dated
                .filter((event) => event.date === date)
                .sort((a, b) =>
                  (a.invitationTime || a.serviceTime).localeCompare(
                    b.invitationTime || b.serviceTime,
                  ),
                );
              return (
                <section key={date}>
                  <h3 className="group-title mb-2 text-forest/55">
                    {formatDayHeading(new Date(`${date}T12:00:00`))}
                  </h3>
                  <Card flush>
                    {dayEvents.map((event, index) => {
                      const href = hrefForEvent?.(event);
                      const row = (
                        <div
                          className={cn(
                            "grid gap-3 px-4 py-3 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center",
                            index > 0 && "border-t border-line",
                            selectedId === event.id && "bg-forest/[0.04]",
                          )}
                        >
                          <p className="tabular text-sm font-medium text-forest">
                            {event.date ? formatShortDate(event.date) : "Sem data"}
                          </p>
                          <div className="min-w-0">
                            <p className="section-title">{event.title || "Evento sem nome"}</p>
                            <p className="meta-text mt-1">
                              {event.venue.name || "Local a definir"}
                              {event.code ? ` · ${event.code}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {badge?.(event)}
                            <StatusBadge status={event.status} />
                          </div>
                        </div>
                      );
                      if (href) {
                        return (
                          <Link key={event.id} href={href} className="block hover:bg-cream">
                            {row}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={event.id}
                          type="button"
                          className="block w-full text-left hover:bg-cream"
                          onClick={() => onSelect?.(event)}
                        >
                          {row}
                        </button>
                      );
                    })}
                  </Card>
                </section>
              );
            })
          )}
        </div>
      ) : view === "semana" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {weekDays(cursor).map((day) => {
            const dayEvents = eventsOnDay(dated, day);
            return (
              <Card
                key={day.toISOString()}
                className={cn("p-4", isToday(day) && "border-forest/30 bg-forest/[0.03]")}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="group-title text-forest/60">{formatDayHeading(day)}</h3>
                  {isToday(day) ? <StatusPill tone="info">Hoje</StatusPill> : null}
                </div>
                {dayEvents.length === 0 ? (
                  <p className="meta-text">Sem eventos neste dia.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {dayEvents.map((event) => renderChip(event, true))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <MonthCalendarGrid
          days={days}
          cursor={cursor}
          headerExtra={(day) => {
            const count = eventsOnDay(dated, day).length;
            return count > 0 ? <span className="tabular text-[11px] text-forest/40">{count}</span> : null;
          }}
        >
          {(day) => eventsOnDay(dated, day).map((event) => renderChip(event))}
        </MonthCalendarGrid>
      )}

      {undated.length > 0 ? (
        <Card className="max-h-28 shrink-0 overflow-y-auto p-3">
          <h3 className="group-title mb-2 text-forest/60">Sem data</h3>
          <div className="grid gap-2 sm:grid-cols-2">{undated.map((event) => renderChip(event, true))}</div>
        </Card>
      ) : null}
    </div>
  );
}
