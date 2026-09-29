"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Download, History } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useCozinhaInsumos } from "@/components/cozinha/cozinha-insumos-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import {
  CONSUMPTION_WINDOW_DAYS,
  averageDailyConsumption,
  computeInsumoBalances,
  coverageDays,
  effectiveMinimum,
  getInsumoMeta,
  insumoBalance,
  insumoMetaMap,
  movementsOfInsumo,
  stockSignal,
  suggestedMinimum,
  type StockSignal,
} from "@/lib/cozinha/calc";
import { INSUMO_MOVEMENT_LABELS, type InsumoMeta, type InsumoMinSource } from "@/lib/cozinha/types";
import type { InsumoRecord } from "@/lib/cadastros/types";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { exportToXlsx } from "@/lib/cadastros/xlsx";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type SortKey = "name" | "qty";

export function EstoqueInsumos() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data, ready: stockReady, upsertMeta } = useCozinhaInsumos();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<InsumoRecord | null>(null);
  const [onlyBuy, setOnlyBuy] = useState(false);

  const balances = useMemo(() => computeInsumoBalances(data?.movements ?? []), [data]);
  const meta = useMemo(() => insumoMetaMap(data?.meta ?? []), [data]);
  const movements = useMemo(() => data?.movements ?? [], [data]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    if (!cadastros) return [];
    const term = search.trim().toLowerCase();
    const list = [...cadastros.insumos]
      .filter((insumo) => (categories.length ? categories.includes(insumo.category) : true))
      .map((insumo) => {
        const balance = insumoBalance(balances, insumo.id);
        const itemMeta = getInsumoMeta(meta, insumo.id);
        const daily = averageDailyConsumption(movements, insumo.id);
        return {
          insumo,
          balance,
          meta: itemMeta,
          daily,
          min: effectiveMinimum(itemMeta, daily),
          signal: stockSignal(balance, itemMeta, daily),
        };
      })
      .filter((row) => (onlyBuy ? row.signal === "comprar" : true))
      .filter((row) => {
        if (!term) return true;
        return (
          row.insumo.name.toLowerCase().includes(term) ||
          row.insumo.category.toLowerCase().includes(term) ||
          row.insumo.brand.toLowerCase().includes(term)
        );
      });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "qty") cmp = a.balance - b.balance;
      else
        cmp =
          a.insumo.category.localeCompare(b.insumo.category, "pt-BR") ||
          a.insumo.name.localeCompare(b.insumo.name, "pt-BR");
      return cmp * dir;
    });
    return list;
  }, [cadastros, categories, search, balances, meta, movements, sortKey, sortDir, onlyBuy]);

  const alerts = useMemo(() => {
    let buy = 0;
    let excess = 0;
    for (const insumo of cadastros?.insumos ?? []) {
      const itemMeta = getInsumoMeta(meta, insumo.id);
      const signal = stockSignal(
        insumoBalance(balances, insumo.id),
        itemMeta,
        averageDailyConsumption(movements, insumo.id),
      );
      if (signal === "comprar") buy += 1;
      if (signal === "excesso") excess += 1;
    }
    return { buy, excess };
  }, [cadastros, balances, meta, movements]);
  const ready = cadReady && stockReady;

  const handleExport = async () => {
    if (!cadastros) return;
    const headers = ["Insumo", "Categoria", "Marca", "Saldo", "Unidade", "Custo unitário", "Mínimo"];
    const body = rows.map((r) => [
      r.insumo.name,
      r.insumo.category,
      r.insumo.brand,
      r.balance,
      r.insumo.unit,
      r.insumo.unitCost,
      r.min,
    ]);
    try {
      await exportToXlsx("estoque-insumos-casa-braga", "Estoque", headers, body);
      toast.success("Estoque exportado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar.");
    }
  };

  return (
    <PageShell
      eyebrow="Cozinha"
      title="Estoque de Insumos"
      description={`O mínimo é o consumo médio dos últimos ${CONSUMPTION_WINDOW_DAYS} dias vezes os dias que o fornecedor leva para repor. Abaixo disso, é hora de comprar.`}
      actions={
        <Button variant="outline" className="px-3" onClick={handleExport} disabled={!cadastros}>
          <Download data-icon="inline-start" />
          Exportar
        </Button>
      }
    >

      {!ready ? (
        <LoadingBlock />
      ) : !cadastros || !data ? (
        <EmptyBlock title="Estoque indisponível" description="Recarregue a página." />
      ) : cadastros.insumos.length === 0 ? (
        <EmptyBlock
          title="Nenhum insumo"
          description="Cadastre insumos em Cadastros → Insumos para controlar o estoque."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <CatalogFilters
              compact
              search={search}
              onSearch={setSearch}
              searchPlaceholder="Buscar insumo…"
              multiFacets={[
                {
                  id: "category",
                  label: "Categoria",
                  values: categories,
                  onChange: setCategories,
                  countedNoun: "categorias",
                  options: cadastros.insumoCategories.map((item) => ({ value: item, label: item })),
                },
              ]}
            />
            {alerts.buy > 0 || alerts.excess > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {alerts.buy > 0 ? (
                  <FilterChip
                    tone="danger"
                    active={onlyBuy}
                    onClick={() => setOnlyBuy((current) => !current)}
                    className={cn(!onlyBuy && "border-danger/30 text-danger hover:border-danger/50 hover:text-danger")}
                  >
                    <AlertTriangle className="size-3.5" />
                    <span className="tabular">{alerts.buy}</span> para comprar
                  </FilterChip>
                ) : null}
                {alerts.excess > 0 ? (
                  <StatusPill className="h-8 px-3 text-[13px]">
                    <span className="tabular">{alerts.excess}</span>&nbsp;com excesso parado
                  </StatusPill>
                ) : null}
              </div>
            ) : null}
          </div>

          <Card flush>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <SortTh label="Insumo" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} className="pl-5" />
                  <th className="field-label py-3 text-right font-normal text-forest/55">Mínimo</th>
                  <th className="field-label py-3 font-normal text-forest/55">Situação</th>
                  <SortTh label="Saldo" align="right" active={sortKey === "qty"} dir={sortDir} onClick={() => toggleSort("qty")} className="pr-5" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="meta-text px-5 py-10 text-center">
                      Nenhum insumo com esses filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ insumo, balance, min, signal, meta: itemMeta }) => {
                    const low = signal === "comprar";
                    return (
                      <tr
                        key={insumo.id}
                        tabIndex={0}
                        onClick={() => setSelected(insumo)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(insumo);
                          }
                        }}
                        className={cn(
                          "cursor-pointer border-b border-line last:border-0 hover:bg-forest/[0.02]",
                          low && "bg-danger/[0.04]",
                        )}
                      >
                        <td className="py-3 pl-5">
                          <p className="text-forest">{insumo.name}</p>
                          <p className="meta-text">
                            {insumo.category}
                            {insumo.brand ? ` · ${insumo.brand}` : ""}
                            {itemMeta.perishable ? " · perecível" : ""}
                          </p>
                        </td>
                        <td className="py-3 text-right tabular text-forest/70">
                          {min > 0 ? formatDecimal(min, 2) : "—"}
                        </td>
                        <td className="py-3">
                          <SignalLabel signal={signal} />
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <span className={cn("tabular", low ? "text-danger" : "text-forest")}>
                            {formatDecimal(balance, 2)}
                          </span>
                          <span className="meta-text ml-1">{insumo.unit}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}

      {selected && data ? (
        <Modal open onClose={() => setSelected(null)} title={selected.name} wide>
          <InsumoStockPanel
            key={selected.id}
            insumo={selected}
            total={insumoBalance(balances, selected.id)}
            meta={getInsumoMeta(meta, selected.id)}
            daily={averageDailyConsumption(data.movements, selected.id)}
            movements={movementsOfInsumo(data, selected.id)}
            onMeta={(next) => {
              upsertMeta(next);
              toast.success("Estoque mínimo atualizado.");
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
  align,
  className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "right";
  className?: string;
}) {
  return (
    <th className={cn("field-label py-3 font-normal", align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-forest",
          active ? "text-forest" : "text-forest/55",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {active ? (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : null}
      </button>
    </th>
  );
}

const SIGNAL_LABEL: Record<StockSignal, string> = {
  comprar: "Comprar",
  excesso: "Excesso",
  ok: "Em dia",
  "sem-regra": "Sem mínimo",
};

const SIGNAL_TONE: Record<StockSignal, StatusTone> = {
  comprar: "danger",
  excesso: "warn",
  ok: "ok",
  "sem-regra": "neutral",
};

function SignalLabel({ signal }: { signal: StockSignal }) {
  return <StatusPill tone={SIGNAL_TONE[signal]}>{SIGNAL_LABEL[signal]}</StatusPill>;
}

function InsumoStockPanel({
  insumo,
  total,
  meta,
  daily,
  movements,
  onMeta,
}: {
  insumo: InsumoRecord;
  total: number;
  meta: InsumoMeta;
  daily: number;
  movements: import("@/lib/cozinha/types").InsumoMovement[];
  onMeta: (meta: InsumoMeta) => void;
}) {
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const sortedMovements = [...movements].sort((a, b) => compareDateSort(a.date, b.date, dateSort));
  const [leadDays, setLeadDays] = useState(meta.leadDays);
  const [minSource, setMinSource] = useState<InsumoMinSource>(meta.minSource);
  const [manualMin, setManualMin] = useState(meta.min);
  const [perishable, setPerishable] = useState(meta.perishable);
  const suggested = suggestedMinimum(daily, leadDays);
  const minimum = minSource === "manual" ? manualMin : suggested;
  const cover = coverageDays(total, daily);

  const save = () => {
    if (minSource === "manual" && manualMin < 0) {
      toast.error("O mínimo não pode ser negativo.");
      return;
    }
    onMeta({
      insumoId: insumo.id,
      leadDays: Math.max(0, Math.round(leadDays)),
      minSource,
      min: Math.max(0, minimum),
      perishable,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="field-label">Saldo atual</p>
            <p className="meta-text mt-1">
              {insumo.category}
              {insumo.brand ? ` · ${insumo.brand}` : ""}
              {insumo.unitCost ? ` · ${formatBRL(insumo.unitCost)}/${insumo.unit}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-[15px] font-semibold tabular text-forest">
            {formatDecimal(total, 2)} <span className="font-normal text-forest/50">{insumo.unit}</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="section-title">Estoque mínimo</h3>
        <p className="meta-text">
          Consumo médio: {formatDecimal(daily, 2)} {insumo.unit}/dia nos últimos {CONSUMPTION_WINDOW_DAYS} dias
          {cover != null ? ` · o saldo cobre ${formatDecimal(cover, 1)} dias` : ""}.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tempo de reposição (dias)">
            <input
              type="number"
              min={0}
              step={1}
              className={fieldControlClass}
              value={leadDays || ""}
              onChange={(event) => setLeadDays(Number(event.target.value))}
            />
          </Field>
          <Field label="Mínimo calculado">
            <input className={fieldControlClass} readOnly value={suggested > 0 ? formatDecimal(suggested, 2) : "—"} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input
            type="checkbox"
            className="size-4 accent-forest"
            checked={minSource === "manual"}
            onChange={(event) => setMinSource(event.target.checked ? "manual" : "calculo")}
          />
          Definir outro mínimo
        </label>
        {minSource === "manual" ? (
          <Field label="Mínimo manual">
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldControlClass}
              value={manualMin}
              onChange={(event) => setManualMin(Number(event.target.value))}
            />
          </Field>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input
            type="checkbox"
            className="size-4 accent-forest"
            checked={perishable}
            onChange={(event) => setPerishable(event.target.checked)}
          />
          Perecível — entra na contagem semanal
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-forest/70">
            Ponto de pedido: <span className="font-medium tabular text-forest">{minimum > 0 ? formatDecimal(minimum, 2) : "—"}</span>{" "}
            {insumo.unit}
          </p>
          <Button className="px-4" onClick={save}>
            Salvar
          </Button>
        </div>
        <Link href="/cozinha/movimentacoes-estoque" className="inline-block text-sm text-forest/70 underline-offset-2 hover:underline">
          Registrar entrada ou saída
        </Link>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title flex items-center gap-1.5">
            <History className="size-4" />
            Movimentações
          </h3>
          {movements.length > 0 ? (
            <DateSortSelect value={dateSort} onChange={setDateSort} className="h-8" />
          ) : null}
        </div>
        {movements.length === 0 ? (
          <p className="meta-text py-3">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {sortedMovements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <span className="meta-text tabular">{formatShortDate(m.date.slice(0, 10))}</span>
                  <span className="text-forest/70">{INSUMO_MOVEMENT_LABELS[m.type]}</span>
                  {m.note ? <span className="meta-text">· {m.note}</span> : null}
                </span>
                <span className={cn("shrink-0 font-medium tabular", m.quantity >= 0 ? "text-forest" : "text-danger")}>
                  {m.quantity >= 0 ? "+" : ""}
                  {formatDecimal(m.quantity, 2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
