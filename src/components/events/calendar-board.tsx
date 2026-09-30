"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  format,
  isToday,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, FileDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyBlock, FilterMultiSelect } from "@/components/cadastros/ui";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { fieldControlClass } from "@/components/events/field";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { StatusBadge } from "@/components/events/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented";
import { StatusPill } from "@/components/ui/status-pill";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { MonthCalendarGrid } from "@/components/events/month-calendar-grid";
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

function PdfButton({ event, roomy }: { event: EventRecord; roomy?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Baixar PDF de ${event.title || event.code}`}
      title="Baixar PDF da cozinha"
      className={cn(
        "flex shrink-0 items-center justify-center rounded text-current opacity-75 hover:opacity-100",
        roomy ? "size-7" : "size-6",
      )}
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
      <FileDown className={roomy ? "size-3.5" : "size-3"} />
    </button>
  );
}

function EventChip({ event, roomy = false }: { event: EventRecord; roomy?: boolean }) {
  return (
    <div className={cn("flex items-center gap-1 rounded-md pr-1", `cal-chip-${event.status}`)}>
      <Link
        href={`/eventos/${event.id}`}
        className={cn(
          "min-w-0 flex-1 transition-colors hover:opacity-90",
          roomy ? "px-2.5 py-1.5" : "px-2 py-1",
        )}
      >
        <p className={cn("truncate font-medium", roomy ? "text-[13px] leading-5" : "text-[12px] leading-4")}>
          {event.ceremonyTime || event.invitationTime || event.serviceTime || "—"} · {event.title}
        </p>
      </Link>
      <PdfButton event={event} roomy={roomy} />
    </div>
  );
}

function periodDays(from: string, to: string) {
  const start = parseISO(from);
  const end = parseISO(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return eachDayOfInterval({ start, end });
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("asc");

  const rangeInvalid = Boolean(from && to && from > to);
  const range = !rangeInvalid && from && to ? periodDays(from, to) : null;

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const clientName = event.clientId ? (clientNames.get(event.clientId) ?? "") : "";
      const hay = `${event.title} ${event.code} ${event.venue.name} ${event.venue.address} ${clientName}`.toLowerCase();
      const matchesQuery = hay.includes(query.trim().toLowerCase());
      const matchesStatus = statuses.length === 0 || statuses.includes(event.status);
      const matchesType = types.length === 0 || types.includes(event.type);
      const matchesFrom = !from || event.date >= from;
      const matchesTo = !to || event.date <= to;
      return matchesQuery && matchesStatus && matchesType && !rangeInvalid && matchesFrom && matchesTo;
    });
  }, [events, query, statuses, types, clientNames, from, to, rangeInvalid]);

  const days = view === "mes" ? monthGrid(cursor) : range ?? weekDays(cursor);
  const weekShown =
    range && range.length > 45 ? days.filter((day) => eventsOnDay(filtered, day).length > 0) : days;
  const listDays = useMemo(() => {
    return [...new Set(filtered.map((event) => event.date))].sort((a, b) =>
      compareDateSort(a, b, dateSort),
    );
  }, [filtered, dateSort]);

  const shift = (direction: number) => {
    if (view === "semana" && range && from && to) {
      setFrom(format(addDays(parseISO(from), direction * 7), "yyyy-MM-dd"));
      setTo(format(addDays(parseISO(to), direction * 7), "yyyy-MM-dd"));
      return;
    }
    if (view === "semana") setCursor((current) => addWeeks(current, direction));
    else setCursor((current) => addMonths(current, direction));
  };

  const periodLabel =
    view === "semana" && range
      ? `${format(range[0], "d MMM", { locale: ptBR })} — ${format(range[range.length - 1], "d MMM yyyy", { locale: ptBR })}`
      : view === "semana"
        ? `${format(weekDays(cursor)[0], "d MMM", { locale: ptBR })} — ${format(weekDays(cursor)[6], "d MMM yyyy", { locale: ptBR })}`
        : formatMonthTitle(cursor);

  return (
    <PageShell
      width="wide"
      fillViewport
      eyebrow="Eventos"
      title="Calendário de Eventos"
      actions={
        <Link href="/eventos/novo" className={cn(buttonVariants(), "px-4")}>
          <Plus data-icon="inline-start" />
          Novo evento
        </Link>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Card className="flex shrink-0 flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, cliente ou código"
            className={cn(fieldControlClass, "min-w-0 sm:min-w-[220px] sm:flex-1")}
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
        </Card>

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
            <label className="meta-text flex items-center gap-1.5 font-medium">
              De
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => {
                  const value = event.target.value;
                  setFrom(value);
                  if (value) setCursor(parseISO(value));
                }}
                className={cn(fieldControlClass, "tabular w-auto")}
              />
            </label>
            <label className="meta-text flex items-center gap-1.5 font-medium">
              Até
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                className={cn(fieldControlClass, "tabular w-auto")}
              />
            </label>
            {from || to ? (
              <Button
                variant="outline"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
              >
                Limpar
              </Button>
            ) : null}
            {view === "lista" ? (
              <DateSortSelect value={dateSort} onChange={setDateSort} />
            ) : null}
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
        {rangeInvalid ? (
          <p className="text-[13px] text-danger">A data final precisa ser igual ou posterior à inicial.</p>
        ) : null}

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
                  <h3 className="group-title mb-2 text-forest/55">
                    {formatDayHeading(new Date(`${date}T12:00:00`))}
                  </h3>
                  <Card flush>
                    {dayEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className={cn(
                          "grid gap-3 px-4 py-3 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center",
                          index > 0 && "border-t border-line",
                        )}
                      >
                        <p className="tabular text-sm font-medium text-forest">
                          {event.invitationTime || "—"}
                          {event.serviceTime ? ` · serviço ${event.serviceTime}` : ""}
                        </p>
                        <Link href={`/eventos/${event.id}`} className="min-w-0 hover:opacity-80">
                          <p className="section-title">{event.title}</p>
                          <p className="meta-text mt-1">
                            {EVENT_TYPE_LABELS[event.type]} · {event.venue.name} ·{" "}
                            <span className="tabular">{guestTotal(event.guests)}</span> pessoas · {event.code}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={event.status} />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
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
                  </Card>
                </section>
              );
            })}
          </div>
        ) : view === "semana" ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {range && range.length > 45 ? (
              <p className="meta-text">
                Neste intervalo longo, a visão de semana mostra só os dias com evento.
              </p>
            ) : null}
            {weekShown.length === 0 ? <EmptyState /> : null}
            {weekShown.map((day) => {
              const dayEvents = eventsOnDay(filtered, day);
              return (
                <Card
                  key={day.toISOString()}
                  className={cn("p-4", isToday(day) && "border-forest/30 bg-forest/[0.03]")}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="group-title text-forest/60">
                      {formatDayHeading(day)}
                    </h3>
                    {isToday(day) && <StatusPill tone="info">Hoje</StatusPill>}
                  </div>
                  {dayEvents.length === 0 ? (
                    <p className="meta-text">Sem eventos neste dia.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {dayEvents.map((event) => (
                        <EventChip key={event.id} event={event} roomy />
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <>
            <MonthCalendarGrid
              days={days}
              cursor={cursor}
              headerExtra={(day) => {
                const count = eventsOnDay(filtered, day).length;
                return count > 0 ? (
                  <span className="tabular text-[11px] text-forest/40">{count}</span>
                ) : null;
              }}
            >
              {(day) => eventsOnDay(filtered, day).map((event) => <EventChip key={event.id} event={event} />)}
            </MonthCalendarGrid>
          </>
        )}
      </div>
    </PageShell>
  );
}

function EmptyState() {
  return (
    <EmptyBlock
      title="Nenhum evento neste recorte"
      description="Ajuste os filtros ou crie um novo evento para a casa."
      action={
        <Link href="/eventos/novo" className={buttonVariants()}>
          Novo evento
        </Link>
      }
    />
  );
}
