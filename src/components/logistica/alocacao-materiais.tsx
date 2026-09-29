"use client";

import { addWeeks, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CatalogFilters, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { useEvents } from "@/components/events/events-provider";
import { downloadRuptureWeekPdf } from "@/components/logistica/alocacao-pdf";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented";
import { KpiCard } from "@/components/ui/status-pill";
import { formatInt } from "@/lib/crm/format";
import { formatShortDate, formatWeekRange, toIsoDate, weekDaysMonday } from "@/lib/dates";
import {
  buildAllocationWeek,
  clipBarToWeek,
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

  const header = { eyebrow: "Logística", title: "Alocação de Materiais", width: "wide" as const };

  if (!ready) {
    return (
      <PageShell {...header}>
        <LoadingBlock />
      </PageShell>
    );
  }

  if (!cadastros) {
    return (
      <PageShell {...header}>
        <EmptyBlock title="Indisponível" description="Recarregue a página." />
      </PageShell>
    );
  }

  const missing = week.missingDates.length;

  return (
    <PageShell
      {...header}
      actions={
        <>
          <div className="flex items-center rounded-md border border-line bg-white">
            <Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setCursor((d) => addWeeks(d, -1))}>
              <ChevronLeft />
            </Button>
            <p className="min-w-[9.5rem] text-center text-[13px] font-semibold text-forest tabular">{weekLabel}</p>
            <Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setCursor((d) => addWeeks(d, 1))}>
              <ChevronRight />
            </Button>
          </div>
          <button
            type="button"
            className="h-10 px-2 text-sm text-forest/55 hover:text-forest"
            onClick={() => setCursor(new Date())}
          >
            Esta semana
          </button>
          <Button variant="outline" className="h-10 px-4" onClick={exportPdf}>
            <FileDown data-icon="inline-start" />
            Relatório
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Eventos na semana" value={String(week.events.length)} />
        <KpiCard
          label="Rupturas"
          value={String(week.ruptures.length)}
          hint={worst ? `Maior falta: ${worst.name}` : "O estoque cobre a semana"}
          tone={week.ruptures.length > 0 ? "danger" : "neutral"}
        />
        <KpiCard
          label="Sem data de entrega ou recolhimento"
          value={String(missing)}
          hint={missing > 0 ? "Não entram na alocação da semana" : "Todas as datas estão preenchidas"}
          tone={missing > 0 ? "warn" : "neutral"}
        />
      </div>

      <Card flush>
        <CardHeader title="Eventos da semana" className="border-b border-line px-4 py-3" />
        {week.events.length === 0 ? (
          <div className="p-4">
            <EmptyBlock
              title="Nenhum evento nesta semana"
              description="Nenhum evento com material alocado nesta semana."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] p-3">
              <div className="mb-2 grid grid-cols-7 gap-1">
                {days.map((day) => (
                  <div
                    key={toIsoDate(day)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-center",
                      isToday(day) ? "bg-forest text-cream" : "bg-forest/[0.04] text-forest/70",
                    )}
                  >
                    <p className="text-[13px] font-medium">
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className="text-sm tabular">{format(day, "d")}</p>
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
                          "flex min-h-9 items-center overflow-hidden rounded-md px-2.5 text-xs font-medium",
                          contributesToRupture
                            ? "bg-danger/15 text-danger hover:bg-danger/25"
                            : "bg-forest text-cream hover:bg-petrol",
                        )}
                        style={{ gridColumn: `${bar.col} / span ${bar.span}` }}
                      >
                        <span className="truncate">
                          {event.title}
                          {event.assumedPickup || event.assumedDelivery ? " · datas" : ""}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card flush>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedControl
            ariaLabel="Visão"
            value={view}
            onChange={setView}
            options={[
              { value: "ruptura", label: "Só rupturas" },
              { value: "todos", label: "Todos" },
            ]}
            className="self-start"
          />
          <CatalogFilters
            compact
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="field-label py-3 pl-4 font-normal">Material</th>
                <th className="field-label w-14 py-3 text-right font-normal">Est.</th>
                <th className="field-label w-14 py-3 text-right font-normal">Pico</th>
                <th className="field-label w-14 py-3 pr-2 text-right font-normal">Falta</th>
                {days.map((day) => (
                  <th key={toIsoDate(day)} className="field-label w-11 py-2 text-center font-normal">
                    <span className="block capitalize">{format(day, "EEE", { locale: ptBR }).replace(".", "")}</span>
                    <span className={cn("block text-[13px]", isToday(day) && "font-semibold text-forest")}>
                      {format(day, "d")}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4 + days.length} className="meta-text px-4 py-10 text-center">
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
      </Card>
    </PageShell>
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
          "border-b border-line last:border-0",
          row.shortage > 0 && "bg-danger/[0.04]",
        )}
      >
        <td className="py-2 pl-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center gap-2 px-2 text-left"
          >
            <ChevronDown className={cn("size-4 shrink-0 text-forest/35 transition", open && "rotate-180")} />
            <span className="min-w-0">
              <span className="font-medium text-forest">{row.name}</span>
              <span className="meta-text block">
                {row.category}
                {row.unit ? ` · ${row.unit}` : ""}
              </span>
            </span>
          </button>
        </td>
        <td className="py-2 text-right text-forest/70 tabular">{formatInt(row.stock)}</td>
        <td className="py-2 text-right text-forest tabular">{formatInt(row.peak)}</td>
        <td className={cn("py-2 pr-2 text-right font-medium tabular", row.shortage > 0 ? "text-danger" : "text-forest/35")}>
          {row.shortage > 0 ? formatInt(row.shortage) : "—"}
        </td>
        {row.days.map((cell, index) => (
          <td key={days[index]} className="px-0.5 py-2">
            <DayCell cell={cell} />
          </td>
        ))}
      </tr>
      {open ? (
        <tr className="border-b border-line bg-forest/[0.02]">
          <td colSpan={4 + days.length} className="px-6 py-3">
            <p className="meta-text mb-2">
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
    return <p className="meta-text">Nenhum evento neste material.</p>;
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
              className="meta-text hover:text-forest hover:underline"
            >
              Separação
            </Link>
          </div>
          <p className="meta-text mt-0.5 tabular">
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
    return <div className="mx-auto h-7 w-full rounded-md bg-forest/[0.03]" />;
  }
  const rupture = cell.shortage > 0;
  return (
    <div
      title={`${formatInt(cell.demand)} alocados · estoque ${formatInt(cell.stock)}${rupture ? ` · falta ${formatInt(cell.shortage)}` : ""}`}
      className={cn(
        "mx-auto flex h-7 w-full items-center justify-center rounded-md text-[11px] font-medium tabular",
        rupture ? "bg-danger text-cream" : "bg-forest/10 text-forest",
      )}
    >
      {formatInt(cell.demand)}
    </div>
  );
}
