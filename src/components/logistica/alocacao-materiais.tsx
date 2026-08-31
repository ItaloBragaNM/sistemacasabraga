"use client";

import { addWeeks, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { downloadRuptureWeekPdf } from "@/components/logistica/alocacao-pdf";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { Button } from "@/components/ui/button";
import { formatInt } from "@/lib/crm/format";
import { formatShortDate, formatWeekRange, toIsoDate, weekDaysMonday } from "@/lib/dates";
import {
  buildAllocationWeek,
  clipBarToWeek,
  dateInWindow,
  emptyAllocationWeek,
  type MaterialWeekRow,
} from "@/lib/logistica/alocacao";
import { computeBalances } from "@/lib/logistica/calc";
import { cn } from "@/lib/utils";

export function AlocacaoMateriais() {
  const { events, ready: eventsReady } = useEvents();
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady } = useLogistica();
  const [cursor, setCursor] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [view, setView] = useState<"ruptura" | "todos">("ruptura");
  const [openId, setOpenId] = useState<string | null>(null);

  const days = useMemo(() => weekDaysMonday(cursor), [cursor]);
  const dayKeys = useMemo(() => days.map(toIsoDate), [days]);
  const weekLabel = formatWeekRange(days[0], days[6]);
  const balances = useMemo(() => computeBalances(logistica?.movements ?? []), [logistica]);

  const week = useMemo(() => {
    if (!cadastros) return emptyAllocationWeek(dayKeys);
    return buildAllocationWeek(events, cadastros, balances, dayKeys);
  }, [events, cadastros, balances, dayKeys]);

  const categories = useMemo(
    () => [...new Set(week.materials.map((row) => row.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [week.materials],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (view === "ruptura" ? week.ruptures : week.materials).filter((row) => {
      if (category && row.category !== category) return false;
      if (!term) return true;
      return (
        row.name.toLowerCase().includes(term) ||
        row.category.toLowerCase().includes(term) ||
        row.unit.toLowerCase().includes(term)
      );
    });
  }, [week, view, category, search]);

  const worst = week.ruptures[0];
  const ready = eventsReady && cadReady && logReady;
  const overlapPeak = dayKeys.reduce((max, day) => {
    const count = week.events.filter((event) => dateInWindow(day, event.start, event.end)).length;
    return Math.max(max, count);
  }, 0);

  const exportPdf = async () => {
    try {
      await downloadRuptureWeekPdf({
        weekLabel,
        days: dayKeys,
        ruptures: week.ruptures,
        events: week.events,
        fileStamp: `${dayKeys[0]}_${dayKeys[6]}`,
      });
      toast.success("PDF das rupturas da semana baixado.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-16">
        <CadastrosHeader
          eyebrow="Logística"
          title="Controle de Alocação de Materiais"
          description="Confronte o estoque com os eventos simultâneos."
        />
        <LoadingBlock />
      </div>
    );
  }

  if (!cadastros) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-16">
        <CadastrosHeader
          eyebrow="Logística"
          title="Controle de Alocação de Materiais"
          description="Confronte o estoque com os eventos simultâneos."
        />
        <EmptyBlock title="Indisponível" description="Recarregue a página." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Logística"
        title="Controle de Alocação de Materiais"
        description="O material fica locado do dia da entrega até o dia do recolhimento. O estoque precisa cobrir o pico dos eventos que coincidem."
        action={
          <Button variant="outline" className="h-10 px-4" onClick={exportPdf}>
            <FileDown data-icon="inline-start" />
            Relatório da semana
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-forest/10 bg-white px-3 py-2">
        <Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setCursor((d) => addWeeks(d, -1))}>
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <p className="font-section text-[0.72rem] text-forest">{weekLabel}</p>
          <button
            type="button"
            className="text-xs font-light text-forest/50 hover:text-forest"
            onClick={() => setCursor(new Date())}
          >
            Ir para esta semana
          </button>
        </div>
        <Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setCursor((d) => addWeeks(d, 1))}>
          <ChevronRight />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Eventos na janela" value={String(week.events.length)} />
        <Kpi
          label="Materiais em ruptura"
          value={String(week.ruptures.length)}
          warn={week.ruptures.length > 0}
        />
        <Kpi
          label="Maior falta"
          value={worst ? `${formatInt(worst.shortage)}` : "0"}
          hint={worst?.name}
          warn={Boolean(worst)}
        />
        <Kpi label="Pico de eventos no mesmo dia" value={String(overlapPeak)} />
      </div>

      {week.missingDates.length > 0 ? (
        <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-forest/75">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <span>
            {week.missingDates.length} evento(s) sem entrega ou recolhimento na ficha — a alocação
            usa a data do evento. Preencha as datas para o confronto ficar exato.
          </span>
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
        <header className="border-b border-forest/10 px-4 py-3">
          <h2 className="font-section text-[0.82rem] text-forest">Quem leva material nesta semana</h2>
          <p className="mt-1 text-xs font-light text-forest/50">
            Cada barra cobre da entrega ao recolhimento. Onde as barras se sobrepõem, o estoque precisa
            ser a soma.
          </p>
        </header>
        {week.events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm font-light text-forest/50">
            Nenhum evento com material alocado nesta semana.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] p-3">
              <div className="mb-2 grid grid-cols-7 gap-1">
                {days.map((day) => (
                  <div
                    key={toIsoDate(day)}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-center",
                      isToday(day) ? "bg-forest text-cream" : "bg-forest/[0.04] text-forest/70",
                    )}
                  >
                    <p className="text-[0.62rem] uppercase tracking-wide">
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className="font-list text-sm">{format(day, "d")}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {week.events.map((event) => {
                  const bar = clipBarToWeek(event.start, event.end, dayKeys);
                  if (!bar) return null;
                  const contributesToRupture = week.ruptures.some((row) =>
                    row.days.some((cell) => cell.shortage > 0 && cell.events.some((item) => item.id === event.id)),
                  );
                  return (
                    <div key={event.id} className="grid grid-cols-7 gap-1">
                      <Link
                        href={`/eventos/${event.id}`}
                        title={`${event.title} · ${formatShortDate(event.start)} → ${formatShortDate(event.end)}`}
                        className={cn(
                          "flex min-h-9 items-center overflow-hidden rounded-lg px-2.5 text-xs font-medium",
                          contributesToRupture
                            ? "bg-terracotta/15 text-terracotta hover:bg-terracotta/25"
                            : "bg-forest text-cream hover:bg-petrol",
                        )}
                        style={{ gridColumn: `${bar.col} / span ${bar.span}` }}
                      >
                        <span className="truncate">
                          {event.title}
                          {event.assumedPickup || event.assumedDelivery ? " · datas incompletas" : ""}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView("ruptura")}
          className={cn(
            "h-10 rounded-lg px-4 text-sm",
            view === "ruptura" ? "bg-forest text-cream" : "border border-forest/15 bg-white text-forest/70 hover:text-forest",
          )}
        >
          Só rupturas
        </button>
        <button
          type="button"
          onClick={() => setView("todos")}
          className={cn(
            "h-10 rounded-lg px-4 text-sm",
            view === "todos" ? "bg-forest text-cream" : "border border-forest/15 bg-white text-forest/70 hover:text-forest",
          )}
        >
          Todos os alocados
        </button>
      </div>

      <CatalogFilters
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar material…"
        facets={[
          {
            id: "category",
            label: "Categoria",
            value: category,
            onChange: setCategory,
            options: categories.map((item) => ({ value: item, label: item })),
          },
        ]}
      />

      <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-3 pl-4 font-normal">Material</th>
                <th className="field-label py-3 text-right font-normal">Estoque</th>
                <th className="field-label py-3 text-right font-normal">Pico</th>
                <th className="field-label py-3 text-right font-normal">Falta</th>
                {days.map((day) => (
                  <th key={toIsoDate(day)} className="field-label py-3 text-center font-normal">
                    {format(day, "EEE d", { locale: ptBR })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4 + days.length} className="px-4 py-10 text-center text-sm font-light text-forest/50">
                    {view === "ruptura" && week.materials.length > 0
                      ? "Nenhuma ruptura nesta semana. O estoque cobre os eventos simultâneos."
                      : "Nenhum material alocado com esses filtros."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <MaterialRows
                    key={row.materialId}
                    row={row}
                    days={dayKeys}
                    open={openId === row.materialId}
                    onToggle={() => setOpenId((current) => (current === row.materialId ? null : row.materialId))}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-forest/10 bg-white px-4 py-3">
      <p className={cn("font-display text-3xl", warn ? "text-terracotta" : "text-forest")}>{value}</p>
      <p className="field-label mt-1">{label}</p>
      {hint ? <p className="mt-0.5 truncate text-xs font-light text-forest/50">{hint}</p> : null}
    </div>
  );
}

function MaterialRows({
  row,
  days,
  open,
  onToggle,
}: {
  row: MaterialWeekRow;
  days: string[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-forest/5 last:border-0",
          row.shortage > 0 && "bg-terracotta/[0.04]",
        )}
      >
        <td className="py-2 pl-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center gap-2 px-2 text-left"
          >
            <ChevronDown className={cn("size-4 shrink-0 text-forest/35 transition", open && "rotate-180")} />
            <span>
              <span className="font-list font-medium text-forest">{row.name}</span>
              <span className="block text-xs font-light text-forest/45">
                {row.category}
                {row.unit ? ` · ${row.unit}` : ""}
              </span>
            </span>
          </button>
        </td>
        <td className="py-2 text-right text-forest/70">{formatInt(row.stock)}</td>
        <td className="py-2 text-right text-forest">{formatInt(row.peak)}</td>
        <td className={cn("py-2 text-right font-medium", row.shortage > 0 ? "text-terracotta" : "text-forest/35")}>
          {row.shortage > 0 ? formatInt(row.shortage) : "—"}
        </td>
        {row.days.map((cell, index) => (
          <td key={days[index]} className="px-1 py-2">
            <DayCell cell={cell} />
          </td>
        ))}
      </tr>
      {open ? (
        <tr className="border-b border-forest/5 bg-forest/[0.02]">
          <td colSpan={4 + days.length} className="px-6 py-3">
            <p className="mb-2 text-xs font-light text-forest/50">
              Quem leva este material nesta semana
            </p>
            <EventBreakdown row={row} days={days} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function EventBreakdown({ row, days }: { row: MaterialWeekRow; days: string[] }) {
  const byEvent = new Map<
    string,
    { id: string; title: string; code: string; lines: { day: string; qty: number; shortage: number }[] }
  >();
  row.days.forEach((cell, index) => {
    for (const event of cell.events) {
      const current = byEvent.get(event.id) ?? {
        id: event.id,
        title: event.title,
        code: event.code,
        lines: [],
      };
      current.lines.push({ day: days[index], qty: event.qty, shortage: cell.shortage });
      byEvent.set(event.id, current);
    }
  });
  const list = [...byEvent.values()];
  if (list.length === 0) {
    return <p className="text-sm font-light text-forest/50">Nenhum evento neste material.</p>;
  }
  return (
    <ul className="space-y-3 text-sm">
      {list.map((event) => (
        <li key={event.id} className="text-forest/80">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href={`/eventos/${event.id}`} className="font-medium text-forest hover:underline">
              {event.title}
              {event.code ? ` · ${event.code}` : ""}
            </Link>
            <Link
              href={`/logistica/separacao-materiais/${event.id}`}
              className="text-xs text-forest/45 hover:text-forest hover:underline"
            >
              Separação
            </Link>
          </div>
          <p className="mt-0.5 text-xs font-light text-forest/55">
            {event.lines
              .map((line) => {
                const shortage =
                  line.shortage > 0 ? ` · falta ${formatInt(line.shortage)}` : "";
                return `${formatShortDate(line.day)}: ${formatInt(line.qty)}${shortage}`;
              })
              .join("  ·  ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function DayCell({ cell }: { cell: MaterialWeekRow["days"][number] }) {
  if (cell.demand <= 0) {
    return <div className="mx-auto h-8 w-full max-w-[3.25rem] rounded-md bg-forest/[0.03]" />;
  }
  const rupture = cell.shortage > 0;
  return (
    <div
      title={`${formatInt(cell.demand)} alocados · estoque ${formatInt(cell.stock)}${rupture ? ` · falta ${formatInt(cell.shortage)}` : ""}`}
      className={cn(
        "mx-auto flex h-8 w-full max-w-[3.25rem] items-center justify-center rounded-md text-xs font-medium",
        rupture ? "bg-terracotta text-cream" : "bg-forest/10 text-forest",
      )}
    >
      {formatInt(cell.demand)}
    </div>
  );
}
