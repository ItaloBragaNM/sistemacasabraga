"use client";

import { useMemo, useState } from "react";
import { addMonths, addWeeks, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { MeetingForm } from "@/components/compromissos/meeting-form";
import { useCompromissos } from "@/components/compromissos/compromissos-provider";
import { MonthCalendarGrid } from "@/components/events/month-calendar-grid";
import { fieldControlClass } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented";
import { StatusPill } from "@/components/ui/status-pill";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import {
  checklistProgress,
  emptyMeeting,
  MEETING_KIND_LABELS,
  MEETING_STATUS_LABELS,
  type MeetingKind,
  type MeetingRecord,
} from "@/lib/compromissos/types";
import { formatDayHeading, formatLongDate, formatMonthTitle, monthGrid, toIsoDate, weekDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

type ViewMode = "mes" | "semana" | "lista";

function meetingsOnDay(meetings: MeetingRecord[], day: Date) {
  const key = toIsoDate(day);
  return meetings
    .filter((item) => item.date === key)
    .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
}

function chipClass(meeting: MeetingRecord) {
  if (meeting.status === "cancelada") return "cal-chip-cancelada";
  return meeting.kind === "externa" ? "cal-chip-externa" : "cal-chip-interna";
}

function MeetingChip({
  meeting,
  roomy,
  onOpen,
}: {
  meeting: MeetingRecord;
  roomy?: boolean;
  onOpen: (meeting: MeetingRecord) => void;
}) {
  const progress = checklistProgress(meeting.checklist);
  return (
    <button
      type="button"
      onClick={() => onOpen(meeting)}
      className={cn(
        "w-full rounded-md text-left transition-opacity hover:opacity-90",
        chipClass(meeting),
        roomy ? "px-2.5 py-1.5" : "px-2 py-1",
      )}
    >
      <p className={cn("truncate font-medium", roomy ? "text-[13px] leading-5" : "text-[12px] leading-4")}>
        {meeting.startTime || "—"} · {meeting.title || "Reunião sem nome"}
      </p>
      {roomy ? (
        <p className="mt-0.5 text-[11px] opacity-80">
          {MEETING_KIND_LABELS[meeting.kind]}
          {progress.total ? ` · ${progress.done}/${progress.total} prontos` : ""}
        </p>
      ) : null}
    </button>
  );
}

export function CompromissosCalendar() {
  const { meetings, ready, upsertMeeting, removeMeeting } = useCompromissos();
  const { data: cadastros } = useCadastros();
  const clientNames = useMemo(
    () => new Map((cadastros?.clientes ?? []).map((cliente) => [cliente.id, cliente.name])),
    [cadastros],
  );
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("mes");
  const [kindFilter, setKindFilter] = useState<MeetingKind | "todas">("todas");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MeetingRecord | null>(null);
  const [creating, setCreating] = useState<MeetingRecord | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return meetings.filter((item) => {
      if (kindFilter !== "todas" && item.kind !== kindFilter) return false;
      if (!term) return true;
      const client = item.clientId ? (clientNames.get(item.clientId) ?? "") : "";
      return `${item.title} ${item.salon} ${item.address} ${item.attendees} ${item.driverName} ${client}`
        .toLowerCase()
        .includes(term);
    });
  }, [meetings, kindFilter, query, clientNames]);

  const upcoming = useMemo(() => {
    const today = toIsoDate(new Date());
    return [...filtered]
      .filter((item) => item.status !== "cancelada" && item.status !== "realizada" && item.date >= today)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .slice(0, 5);
  }, [filtered]);

  const days = view === "mes" ? monthGrid(cursor) : weekDays(cursor);
  const listDays = useMemo(
    () => [...new Set(filtered.map((item) => item.date))].sort(),
    [filtered],
  );

  const openNew = (date = toIsoDate(new Date())) => setCreating(emptyMeeting({ date }));
  const closeEditor = () => {
    setEditing(null);
    setCreating(null);
  };

  const save = (meeting: MeetingRecord) => {
    upsertMeeting(meeting);
    toast.success(creating ? "Reunião agendada." : "Reunião atualizada.");
    closeEditor();
  };

  const periodLabel =
    view === "semana"
      ? `${format(weekDays(cursor)[0], "d MMM", { locale: ptBR })} — ${format(weekDays(cursor)[6], "d MMM yyyy", { locale: ptBR })}`
      : formatMonthTitle(cursor);

  if (!ready) {
    return (
      <PageShell eyebrow="Eventos" title="Calendário Geral de Compromissos">
        <LoadingBlock label="Carregando a agenda…" />
      </PageShell>
    );
  }

  return (
    <PageShell
      width="wide"
      fillViewport
      eyebrow="Eventos"
      title="Calendário Geral de Compromissos"
      actions={
        <Button className="h-10 px-5" onClick={() => openNew()}>
          <Plus data-icon="inline-start" />
          Nova reunião
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card className="flex shrink-0 flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por assunto, local ou participante"
          className={cn(fieldControlClass, "min-w-0 sm:min-w-[220px] sm:flex-1")}
        />
        <SegmentedControl
          ariaLabel="Filtrar por tipo"
          value={kindFilter}
          onChange={setKindFilter}
          options={[
            { value: "todas", label: "Todas" },
            { value: "interna", label: "Internas" },
            { value: "externa", label: "Externas" },
          ]}
        />
      </Card>

      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Período anterior"
            onClick={() => setCursor((current) => (view === "semana" ? addWeeks(current, -1) : addMonths(current, -1)))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Próximo período"
            onClick={() => setCursor((current) => (view === "semana" ? addWeeks(current, 1) : addMonths(current, 1)))}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <h2 className="section-title ml-1 capitalize">{periodLabel}</h2>
        </div>
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

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/65">
        <span className="inline-flex items-center gap-1.5">
          <span className="cal-chip-interna size-2.5 rounded-sm" />
          Interna
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="cal-chip-externa size-2.5 rounded-sm" />
          Externa
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="cal-chip-cancelada size-2.5 rounded-sm" />
          Cancelada
        </span>
      </div>

      {upcoming.length ? (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto text-[13px]">
          <span className="shrink-0 font-medium text-forest/55">Próximas</span>
          {upcoming.map((meeting) => {
            const progress = checklistProgress(meeting.checklist);
            return (
              <button
                key={meeting.id}
                type="button"
                onClick={() => setEditing(meeting)}
                className="shrink-0 rounded-md bg-forest/[0.04] px-2 py-1 text-left hover:bg-forest/[0.08]"
              >
                <span className="font-medium text-forest">{meeting.title || "Reunião sem nome"}</span>
                <span className="text-forest/55">
                  {" "}
                  · {formatLongDate(meeting.date)}
                  {meeting.startTime ? ` · ${meeting.startTime}` : ""} · {progress.done}/{progress.total}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "lista" ? (
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          {listDays.length === 0 ? (
            <EmptyBlock
              title="Nenhuma reunião neste recorte"
              description="Agende um compromisso interno ou externo."
              action={
                <Button onClick={() => openNew()}>
                  <Plus data-icon="inline-start" />
                  Nova reunião
                </Button>
              }
            />
          ) : null}
          {listDays.map((date) => {
            const dayMeetings = filtered
              .filter((item) => item.date === date)
              .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
            return (
              <section key={date}>
                <h3 className="group-title mb-2 text-forest/55">
                  {formatDayHeading(new Date(`${date}T12:00:00`))}
                </h3>
                <Card flush>
                  {dayMeetings.map((meeting, index) => {
                    const progress = checklistProgress(meeting.checklist);
                    return (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => setEditing(meeting)}
                        className={cn(
                          "grid w-full gap-3 px-4 py-3 text-left sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center",
                          index > 0 && "border-t border-line",
                        )}
                      >
                        <p className="tabular text-sm font-medium text-forest">
                          {meeting.startTime || "—"}
                          {meeting.endTime ? ` – ${meeting.endTime}` : ""}
                        </p>
                        <div className="min-w-0">
                          <p className="section-title">{meeting.title || "Reunião sem nome"}</p>
                          <p className="meta-text mt-1">
                            {MEETING_KIND_LABELS[meeting.kind]}
                            {meeting.salon ? ` · ${meeting.salon}` : ""}
                            {meeting.address ? ` · ${meeting.address}` : ""}
                            {meeting.attendees ? ` · ${meeting.attendees}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill>{MEETING_STATUS_LABELS[meeting.status]}</StatusPill>
                          <StatusPill tone={progress.done === progress.total && progress.total ? "ok" : "neutral"}>
                            {progress.done}/{progress.total}
                          </StatusPill>
                        </div>
                      </button>
                    );
                  })}
                </Card>
              </section>
            );
          })}
        </div>
      ) : view === "semana" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {days.map((day) => {
            const dayMeetings = meetingsOnDay(filtered, day);
            return (
              <Card
                key={day.toISOString()}
                className={cn("p-4", isToday(day) && "border-forest/30 bg-forest/[0.03]")}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="group-title text-forest/60">{formatDayHeading(day)}</h3>
                  <div className="flex items-center gap-2">
                    {isToday(day) ? <StatusPill tone="info">Hoje</StatusPill> : null}
                    <Button variant="outline" size="sm" onClick={() => openNew(toIsoDate(day))}>
                      <Plus data-icon="inline-start" />
                      Reunião
                    </Button>
                  </div>
                </div>
                {dayMeetings.length === 0 ? (
                  <p className="meta-text">Sem reuniões neste dia.</p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {dayMeetings.map((meeting) => (
                      <MeetingChip key={meeting.id} meeting={meeting} roomy onOpen={setEditing} />
                    ))}
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
          headerExtra={(day) => (
            <button
              type="button"
              aria-label={`Nova reunião em ${formatDayHeading(day)}`}
              className="text-forest/30 hover:text-forest"
              onClick={() => openNew(toIsoDate(day))}
            >
              <Plus className="size-3.5" />
            </button>
          )}
        >
          {(day) =>
            meetingsOnDay(filtered, day).map((meeting) => (
              <MeetingChip key={meeting.id} meeting={meeting} onOpen={setEditing} />
            ))
          }
        </MonthCalendarGrid>
      )}
      </div>

      <Modal
        open={Boolean(creating || editing)}
        onClose={closeEditor}
        title={editing ? "Editar reunião" : "Nova reunião"}
        wide
      >
        {creating || editing ? (
          <MeetingForm
            key={editing?.id ?? creating?.id ?? "new"}
            initial={editing ?? creating!}
            onCancel={closeEditor}
            onSubmit={save}
            onDelete={
              editing
                ? () => {
                    if (!window.confirm(`Excluir "${editing.title || "esta reunião"}"?`)) return;
                    removeMeeting(editing.id);
                    toast.success("Reunião excluída.");
                    closeEditor();
                  }
                : undefined
            }
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}
