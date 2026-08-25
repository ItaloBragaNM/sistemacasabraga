"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Loader2, TrendingUp, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CasaBragaMark } from "@/components/brand/mark";
import {
  BarList,
  ConversionBar,
  InfoHint,
  Kpi,
  SummaryTable,
  type BarItem,
  type SummaryRow,
} from "@/components/comercial/ui";
import {
  computeDashboard,
  resolvePeriod,
  type PeriodMode,
} from "@/lib/crm/metrics";
import { formatBRL } from "@/lib/money";
import { formatBRLCompact, formatInt, formatPercent } from "@/lib/crm/format";
import type { CrmSnapshot } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const D = {
  totalWon:
    "Soma do valor de venda de tudo que fechou como Venda Ganha no período. É o faturamento gerado.",
  wonCount:
    "Quantos leads fecharam como Venda Ganha no período — mede volume, não valor.",
  ticket:
    "Total Vendido ÷ Quantidade de Eventos Ganhos. Mostra se o crescimento vem de mais eventos ou de eventos mais caros.",
  totalLost:
    "Soma do valor de venda de tudo que fechou como Venda Perdida no período — receita que passou pelo funil e não se converteu.",
  lostCount: "Quantos leads fecharam como Venda Perdida no período.",
  byLocation:
    "Os mesmos indicadores gerais, quebrados por modalidade de atendimento (Buffet Móvel × Casa Braga) — mostra qual formato performa melhor.",
  byType: "Os mesmos indicadores, quebrados por segmento de evento.",
  semTipo:
    "Eventos perdidos sem o campo Tipo de Evento preenchido no CRM — é um alerta de qualidade de cadastro, não um indicador de negócio.",
  convValue:
    "De tudo que foi decidido em valor no período, qual fatia virou venda e qual foi perdida — conversão financeira.",
  convCount:
    "A mesma lógica contando eventos. Se divergir muito da conversão em R$, é sinal de que os negócios ganhos (ou perdidos) têm ticket bem diferente da média.",
  winByType:
    "A conversão calculada separadamente para cada segmento, para ver onde a equipe converte melhor ou pior.",
  lossByReason:
    "Dentro do total perdido do período, quanto corresponde a cada motivo de perda.",
  lossRep:
    "Peso percentual de cada motivo no total perdido — ajuda a priorizar qual causa atacar primeiro.",
  lossByType:
    "A mesma quebra por motivo dentro de cada tipo de evento — o motivo predominante pode mudar por segmento (ex.: casamento perde mais por data indisponível; corporativo, por orçamento).",
  sellers:
    "Repete os indicadores dos blocos anteriores lado a lado por vendedora, para comparar quem vende mais, quem tem ticket maior, quem converte melhor e quais motivos de perda pesam mais em cada carteira.",
  created:
    "Quantos leads novos entraram no funil no período, independente de terem fechado — mede geração de demanda.",
  createdClosed:
    "Do que entrou no período, quanto já foi decidido dentro do próprio período — ciclo de venda rápido.",
  closedBefore:
    "Do que fechou no período, quanto veio represado de períodos anteriores. Mostra o quanto o resultado depende do esforço de períodos passados.",
  pipeline:
    "Uma foto do momento presente — quantos leads e quanto em R$ estão parados em cada etapa agora, sem filtro de período. Serve para achar o gargalo do funil.",
} as const;

const PERIOD_TABS: { mode: PeriodMode; label: string }[] = [
  { mode: "month", label: "Mês atual" },
  { mode: "week", label: "Semana atual" },
  { mode: "custom", label: "Personalizado" },
];

export function ComercialDashboard() {
  const [snapshot, setSnapshot] = useState<CrmSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<PeriodMode>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const referenceDate = useMemo(() => new Date(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/comercial/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao carregar");
        const json = (await res.json()) as { snapshot: CrmSnapshot | null };
        if (active) setSnapshot(json.snapshot);
      } catch {
        if (active) setLoadError("Não foi possível carregar os dados salvos.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/comercial/dashboard", { method: "POST", body });
      const json = (await res.json()) as { snapshot?: CrmSnapshot; error?: string };
      if (!res.ok || !json.snapshot) {
        throw new Error(json.error ?? "Não foi possível processar a planilha.");
      }
      setSnapshot(json.snapshot);
      toast.success(`Planilha carregada: ${formatInt(json.snapshot.rowCount)} leads.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar a planilha.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const period = useMemo(
    () => resolvePeriod(mode, referenceDate, { start: customStart, end: customEnd }),
    [mode, referenceDate, customStart, customEnd],
  );

  const data = useMemo(
    () => (snapshot ? computeDashboard(snapshot.leads, period) : null),
    [snapshot, period],
  );

  const periodLabel = useMemo(() => {
    if (mode === "month") return capitalize(format(period.start, "MMMM 'de' yyyy", { locale: ptBR }));
    if (mode === "week") {
      return `Semana de ${format(period.start, "dd/MM")} a ${format(period.end, "dd/MM/yyyy")}`;
    }
    return `${format(period.start, "dd/MM/yyyy")} a ${format(period.end, "dd/MM/yyyy")}`;
  }, [mode, period]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xlsm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <Header
        snapshot={snapshot}
        uploading={uploading}
        onUpload={() => fileRef.current?.click()}
      />

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : !snapshot || !data ? (
        <EmptyState uploading={uploading} onUpload={() => fileRef.current?.click()} />
      ) : (
        <>
          <PeriodSelector
            mode={mode}
            label={periodLabel}
            closedCount={data.closedCount}
            onMode={setMode}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStart={setCustomStart}
            onCustomEnd={setCustomEnd}
          />

          <Block1 data={data} />
          <Block2 data={data} />
          <Block3 data={data} />
          <Block4 data={data} />
          <Block5 data={data} />
          <Block6 data={data} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function Header({
  snapshot,
  uploading,
  onUpload,
}: {
  snapshot: CrmSnapshot | null;
  uploading: boolean;
  onUpload: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-forest/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-section text-[0.68rem] text-terracotta">Comercial</p>
        <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">Dashboard Comercial</h1>
        <p className="mt-2 max-w-xl text-sm font-light text-forest/60">
          Indicadores do funil de vendas a partir da exportação do CRM. Envie a planilha
          e a última versão fica disponível para toda a casa.
        </p>
        {snapshot ? (
          <p className="font-list mt-2 text-xs text-forest/45">
            Última atualização: {format(new Date(snapshot.uploadedAt), "dd/MM/yyyy 'às' HH:mm")} ·{" "}
            {snapshot.fileName} · {formatInt(snapshot.rowCount)} leads
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onUpload}
        disabled={uploading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-forest px-5 text-sm font-medium text-cream transition-colors hover:bg-petrol disabled:opacity-60"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? "Processando…" : snapshot ? "Atualizar planilha" : "Enviar planilha"}
      </button>
    </header>
  );
}

/* ------------------------------------------------------- period selector */

function PeriodSelector({
  mode,
  label,
  closedCount,
  onMode,
  customStart,
  customEnd,
  onCustomStart,
  onCustomEnd,
}: {
  mode: PeriodMode;
  label: string;
  closedCount: number;
  onMode: (mode: PeriodMode) => void;
  customStart: string;
  customEnd: string;
  onCustomStart: (value: string) => void;
  onCustomEnd: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-forest/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-forest/5 p-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              onClick={() => onMode(tab.mode)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors",
                mode === tab.mode
                  ? "bg-forest text-cream shadow-sm"
                  : "text-forest/60 hover:text-forest",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {mode === "custom" ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(event) => onCustomStart(event.target.value)}
              className="h-9 rounded-md border border-forest/15 bg-white px-2.5 text-sm text-forest outline-none focus-visible:border-forest"
            />
            <span className="text-forest/40">—</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => onCustomEnd(event.target.value)}
              className="h-9 rounded-md border border-forest/15 bg-white px-2.5 text-sm text-forest outline-none focus-visible:border-forest"
            />
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-sm text-forest/70">
        <CalendarDays className="size-4 text-terracotta" />
        <span className="font-medium text-forest">{label}</span>
        <span className="text-forest/40">·</span>
        <span className="font-light">{formatInt(closedCount)} eventos decididos</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- sections */

function Block({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="font-display mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm text-cream">
          {number}
        </span>
        <div>
          <h2 className="font-section text-[0.9rem] text-forest">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm font-light leading-6 text-forest/55">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Card({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-forest/10 bg-white p-5", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="font-section text-[0.72rem] text-forest/80">{title}</h3>
          {hint ? <InfoHint text={hint} /> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- blocks */

function Block1({ data }: { data: NonNullable<ReturnType<typeof computeDashboard>> }) {
  const s = data.overall;
  return (
    <Block
      number={1}
      title="Resultados gerais de vendas"
      description="O placar do período: faturamento, volume e ticket dos eventos ganhos, mais o que passou pelo funil e não converteu."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Total Vendido" value={formatBRL(s.totalWon)} hint={D.totalWon} tone="positive" />
        <Kpi label="Eventos Ganhos" value={formatInt(s.wonCount)} hint={D.wonCount} />
        <Kpi label="Ticket Médio" value={formatBRL(s.ticket)} hint={D.ticket} />
        <Kpi label="Valor Perdido" value={formatBRL(s.totalLost)} hint={D.totalLost} tone="negative" />
        <Kpi label="Eventos Perdidos" value={formatInt(s.lostCount)} hint={D.lostCount} tone="negative" />
      </div>
    </Block>
  );
}

function Block2({ data }: { data: NonNullable<ReturnType<typeof computeDashboard>> }) {
  const locationRows: SummaryRow[] = [
    ...data.byLocation.map((seg) => ({
      key: seg.key,
      label: seg.key,
      summary: seg.summary,
      winRate: seg.winRateCount,
    })),
  ];
  if (data.locationMissing.wonCount + data.locationMissing.lostCount > 0) {
    locationRows.push({
      key: "sem-local",
      label: "Sem local",
      summary: data.locationMissing,
      winRate:
        data.locationMissing.wonCount /
        Math.max(data.locationMissing.wonCount + data.locationMissing.lostCount, 1),
      muted: true,
    });
  }

  const typeRows: SummaryRow[] = [
    ...data.byType.map((seg) => ({
      key: seg.key,
      label: seg.key,
      summary: seg.summary,
      winRate: seg.winRateCount,
    })),
  ];
  if (data.typeMissing.wonCount + data.typeMissing.lostCount > 0) {
    typeRows.push({
      key: "sem-tipo",
      label: "Sem tipo",
      summary: data.typeMissing,
      winRate:
        data.typeMissing.wonCount /
        Math.max(data.typeMissing.wonCount + data.typeMissing.lostCount, 1),
      muted: true,
    });
  }

  return (
    <Block
      number={2}
      title="Representatividade por local e por tipo de evento"
      description="Os mesmos indicadores do Bloco 1 quebrados por modalidade de atendimento e por segmento de evento — mostra onde a casa ganha e onde perde."
    >
      <Card title="Por local do evento (Buffet Móvel × Casa Braga)" hint={D.byLocation}>
        <SummaryTable rows={locationRows} />
      </Card>
      <Card title="Por tipo de evento" hint={D.byType}>
        <SummaryTable rows={typeRows} />
      </Card>
      <div className="grid grid-cols-1">
        <Kpi
          label="Eventos perdidos sem tipo de evento"
          value={formatInt(data.lostWithoutType)}
          hint={D.semTipo}
          sub="Alerta de qualidade de cadastro no CRM."
          tone="negative"
        />
      </div>
    </Block>
  );
}

function Block3({ data }: { data: NonNullable<ReturnType<typeof computeDashboard>> }) {
  const c = data.conversion;
  const typeItems: BarItem[] = data.winRateByType
    .filter((seg) => seg.summary.wonCount + seg.summary.lostCount > 0)
    .map((seg) => ({
      label: seg.key,
      weight: seg.winRateCount,
      primary: formatPercent(seg.winRateCount),
      secondary: `${formatInt(seg.summary.wonCount)}/${formatInt(
        seg.summary.wonCount + seg.summary.lostCount,
      )}`,
    }));

  return (
    <Block
      number={3}
      title="Taxa de conversão"
      description="De tudo que foi decidido no período, qual fatia virou venda — em valor e em quantidade — e como isso muda por segmento."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Conversão financeira (R$)" hint={D.convValue}>
          <ConversionBar wonPct={c.wonValuePct} lostPct={c.lostValuePct} />
          <div className="mt-4 flex justify-between text-sm">
            <Legend color="bg-forest" label="Ganho" value={formatPercent(c.wonValuePct)} />
            <Legend color="bg-terracotta" label="Perdido" value={formatPercent(c.lostValuePct)} />
          </div>
          <p className="mt-3 text-xs font-light text-forest/45">
            Valor decidido no período: {formatBRL(c.decidedValue)}
          </p>
        </Card>
        <Card title="Conversão por quantidade" hint={D.convCount}>
          <ConversionBar wonPct={c.wonCountPct} lostPct={c.lostCountPct} />
          <div className="mt-4 flex justify-between text-sm">
            <Legend color="bg-forest" label="Ganho" value={formatPercent(c.wonCountPct)} />
            <Legend color="bg-terracotta" label="Perdido" value={formatPercent(c.lostCountPct)} />
          </div>
          <p className="mt-3 text-xs font-light text-forest/45">
            Eventos decididos no período: {formatInt(c.decidedCount)}
          </p>
        </Card>
      </div>
      <Card title="% Ganho por tipo de evento" hint={D.winByType}>
        <BarList items={typeItems} />
      </Card>
    </Block>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("size-2.5 rounded-full", color)} />
      <span className="font-light text-forest/60">{label}</span>
      <span className="font-medium text-forest">{value}</span>
    </span>
  );
}

function Block4({ data }: { data: NonNullable<ReturnType<typeof computeDashboard>> }) {
  const reasonItems: BarItem[] = data.reasons.map((reason) => ({
    label: reason.reason,
    weight: reason.value,
    primary: formatBRL(reason.value),
    secondary: `${formatPercent(reason.valuePct, 0)} · ${formatInt(reason.count)}`,
  }));

  const typesWithLoss = data.reasonsByType.filter((entry) => entry.totalLost > 0 || entry.reasons.length > 0);

  return (
    <Block
      number={4}
      title="Motivos de perda"
      description="Onde está indo o valor perdido: quanto cada motivo pesa no total e como o motivo predominante muda em cada tipo de evento."
    >
      <Card title="Valor perdido por motivo (e representatividade)" hint={D.lossByReason}>
        <BarList items={reasonItems} tone="terracotta" empty="Nenhuma perda no período." />
        <p className="mt-3 text-xs font-light text-forest/45">
          Total perdido no período: {formatBRL(data.overall.totalLost)}. O percentual ao lado de
          cada motivo é a sua representatividade.
        </p>
      </Card>
      <Card title="Motivos de perda por tipo de evento" hint={D.lossByType}>
        {typesWithLoss.length === 0 ? (
          <p className="py-4 text-sm font-light text-forest/45">Nenhuma perda no período.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {typesWithLoss.map((entry) => (
              <div key={entry.type} className="rounded-xl border border-forest/8 bg-forest/[0.015] p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <h4 className="font-list text-sm font-semibold text-forest">{entry.type}</h4>
                  <span className="text-xs font-light text-terracotta">
                    {formatBRL(entry.totalLost)} perdidos
                  </span>
                </div>
                <BarList
                  tone="terracotta"
                  items={entry.reasons.map((reason) => ({
                    label: reason.reason,
                    weight: reason.value,
                    primary: formatBRLCompact(reason.value),
                    secondary: formatPercent(reason.valuePct, 0),
                  }))}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </Block>
  );
}

function Block5({ data }: { data: NonNullable<ReturnType<typeof computeDashboard>> }) {
  return (
    <Block
      number={5}
      title="Comparativo por vendedor"
      description="Tudo dos blocos anteriores lado a lado por vendedora — quem vende mais, tem ticket maior, converte melhor e quais motivos de perda pesam em cada carteira."
    >
      {data.sellers.length === 0 ? (
        <Card>
          <p className="py-4 text-sm font-light text-forest/45">
            Nenhum evento decidido no período para comparar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.sellers.map((report) => (
            <Card key={report.seller} title={report.seller} hint={D.sellers}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat label="Total Vendido" value={formatBRL(report.summary.totalWon)} />
                <MiniStat label="Ganhos" value={formatInt(report.summary.wonCount)} />
                <MiniStat label="Ticket Médio" value={formatBRL(report.summary.ticket)} />
                <MiniStat
                  label="Valor Perdido"
                  value={formatBRL(report.summary.totalLost)}
                  negative
                />
                <MiniStat label="Perdidos" value={formatInt(report.summary.lostCount)} />
                <MiniStat
                  label="% Ganho (qtd)"
                  value={formatPercent(report.conversion.wonCountPct)}
                />
              </div>
              <div className="mt-3 border-t border-forest/8 pt-3">
                <p className="field-label mb-1">Conversão em R$</p>
                <ConversionBar
                  wonPct={report.conversion.wonValuePct}
                  lostPct={report.conversion.lostValuePct}
                />
              </div>
              <div className="mt-4">
                <p className="field-label mb-2">Motivos de perda</p>
                <BarList
                  tone="terracotta"
                  items={report.reasons.slice(0, 5).map((reason) => ({
                    label: reason.reason,
                    weight: reason.value,
                    primary: formatBRLCompact(reason.value),
                    secondary: formatPercent(reason.valuePct, 0),
                  }))}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </Block>
  );
}

function MiniStat({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div>
      <p className="field-label leading-4">{label}</p>
      <p className={cn("font-display mt-1 text-xl", negative ? "text-terracotta" : "text-forest")}>
        {value}
      </p>
    </div>
  );
}

function Block6({ data }: { data: NonNullable<ReturnType<typeof computeDashboard>> }) {
  const maxCount = Math.max(...data.pipeline.map((stage) => stage.count), 1);
  return (
    <Block
      number={6}
      title="Análise de Leads"
      description="A geração de demanda e o ciclo de venda no período, mais uma foto do funil atual para achar o gargalo."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Leads criados no período" value={formatInt(data.leadsCreated)} hint={D.created} />
        <Kpi
          label="Criados e fechados no período"
          value={formatInt(data.createdAndClosed)}
          hint={D.createdClosed}
        />
        <Kpi
          label="Fechados no período, criados antes"
          value={formatInt(data.closedFromPrevious)}
          hint={D.closedBefore}
        />
      </div>

      <Card title="Funil de conversão — pipeline atual" hint={D.pipeline}>
        <p className="mb-4 text-xs font-light text-forest/50">
          Foto do momento presente, sem filtro de período. Aberto agora:{" "}
          <span className="font-medium text-forest">
            {formatInt(data.pipelineOpenTotal.count)} leads
          </span>{" "}
          · {formatBRL(data.pipelineOpenTotal.value)}
        </p>
        <ul className="space-y-2">
          {data.pipeline.map((stage) => (
            <li
              key={stage.stage}
              className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[220px_1fr_auto]"
            >
              <span
                className={cn(
                  "font-list text-sm",
                  stage.stage === "Venda Ganha"
                    ? "font-semibold text-forest"
                    : stage.stage === "Venda Perdida"
                      ? "font-semibold text-terracotta"
                      : "text-forest/80",
                )}
              >
                {stage.stage}
              </span>
              <div className="hidden h-2 overflow-hidden rounded-full bg-forest/8 sm:block">
                <div
                  className={cn(
                    "h-full rounded-full",
                    stage.stage === "Venda Ganha"
                      ? "bg-forest"
                      : stage.stage === "Venda Perdida"
                        ? "bg-terracotta/80"
                        : "bg-petrol/60",
                  )}
                  style={{ width: `${(stage.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-right text-sm text-forest">
                {formatInt(stage.count)}
                <span className="ml-2 text-xs font-light text-forest/45">
                  {formatBRLCompact(stage.value)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </Block>
  );
}

/* ------------------------------------------------------------ empty/load */

function LoadingState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-forest/50">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm font-light">Carregando o dashboard…</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-terracotta/20 bg-terracotta/5 p-6 text-sm text-terracotta">
      {message}
    </div>
  );
}

function EmptyState({ uploading, onUpload }: { uploading: boolean; onUpload: () => void }) {
  return (
    <div className="flex min-h-[46vh] flex-col items-center justify-center rounded-3xl border border-dashed border-forest/20 bg-white/60 p-10 text-center">
      <div className="mb-6 rounded-full border border-forest/10 bg-forest px-5 py-3">
        <CasaBragaMark compact />
      </div>
      <TrendingUp className="mb-3 size-7 text-terracotta" />
      <h2 className="font-display text-3xl text-forest">Nenhuma planilha carregada</h2>
      <p className="mt-3 max-w-md text-sm font-light leading-7 text-forest/60">
        Envie a exportação do CRM (.xlsx) para gerar o dashboard. A última versão enviada
        fica salva e disponível para toda a casa até a próxima atualização.
      </p>
      <button
        type="button"
        onClick={onUpload}
        disabled={uploading}
        className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-forest px-5 text-sm font-medium text-cream transition-colors hover:bg-petrol disabled:opacity-60"
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? "Processando…" : "Enviar planilha"}
      </button>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
