"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Download, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useCozinhaInsumos } from "@/components/cozinha/cozinha-insumos-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import {
  computeInsumoBalances,
  getInsumoMeta,
  insumoBalance,
  insumoMetaMap,
  movementsOfInsumo,
} from "@/lib/cozinha/calc";
import { INSUMO_MOVEMENT_LABELS, type InsumoMovementType } from "@/lib/cozinha/types";
import type { InsumoRecord } from "@/lib/cadastros/types";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { exportToXlsx } from "@/lib/cadastros/xlsx";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type SortKey = "name" | "qty";

export function EstoqueInsumos() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data, ready: stockReady, addMovement, upsertMeta } = useCozinhaInsumos();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<InsumoRecord | null>(null);

  const balances = useMemo(() => computeInsumoBalances(data?.movements ?? []), [data]);
  const meta = useMemo(() => insumoMetaMap(data?.meta ?? []), [data]);

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
        return {
          insumo,
          balance,
          min: getInsumoMeta(meta, insumo.id).min,
        };
      })
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
  }, [cadastros, categories, search, balances, meta, sortKey, sortDir]);

  const belowMin = rows.filter((r) => r.min > 0 && r.balance < r.min).length;
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
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Cozinha"
        title="Estoque de Insumos"
        action={
          <Button variant="outline" className="h-10 px-3" onClick={handleExport} disabled={!cadastros}>
            <Download data-icon="inline-start" />
            Exportar
          </Button>
        }
      />

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
            {belowMin > 0 ? (
              <span className="inline-flex items-center gap-2 self-start rounded-md bg-terracotta/10 px-3 py-1.5 text-sm text-terracotta">
                <AlertTriangle className="size-4" />
                {belowMin} abaixo do mínimo
              </span>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10">
                  <SortTh label="Insumo" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} className="pl-5" />
                  <SortTh label="Saldo" align="right" active={sortKey === "qty"} dir={sortDir} onClick={() => toggleSort("qty")} className="pr-5" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-sm font-light text-forest/50">
                      Nenhum insumo com esses filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ insumo, balance, min }) => {
                    const low = min > 0 && balance < min;
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
                          "cursor-pointer border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]",
                          low && "bg-terracotta/[0.04]",
                        )}
                      >
                        <td className="py-3 pl-5">
                          <p className="text-forest">{insumo.name}</p>
                          <p className="text-xs font-light text-forest/40">
                            {insumo.category}
                            {insumo.brand ? ` · ${insumo.brand}` : ""}
                          </p>
                        </td>
                        <td className="py-3 pr-5 text-right">
                          <span className={cn("tabular-nums", low ? "text-terracotta" : "text-forest")}>
                            {formatDecimal(balance, 2)}
                          </span>
                          <span className="ml-1 text-xs font-light text-forest/40">{insumo.unit}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && data ? (
        <Modal open onClose={() => setSelected(null)} title={selected.name} wide>
          <InsumoStockPanel
            key={selected.id}
            insumo={selected}
            total={insumoBalance(balances, selected.id)}
            meta={getInsumoMeta(meta, selected.id)}
            movements={movementsOfInsumo(data, selected.id)}
            onMovement={(type, delta, note) => {
              addMovement({
                id: uid(),
                insumoId: selected.id,
                type,
                quantity: delta,
                date: new Date().toISOString(),
                note,
              });
              toast.success("Movimentação registrada.");
            }}
            onMeta={(min) => {
              upsertMeta({ insumoId: selected.id, min });
              toast.success("Mínimo atualizado.");
            }}
          />
        </Modal>
      ) : null}
    </div>
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

function InsumoStockPanel({
  insumo,
  total,
  meta,
  movements,
  onMovement,
  onMeta,
}: {
  insumo: InsumoRecord;
  total: number;
  meta: { min: number };
  movements: import("@/lib/cozinha/types").InsumoMovement[];
  onMovement: (type: InsumoMovementType, delta: number, note: string) => void;
  onMeta: (min: number) => void;
}) {
  const [type, setType] = useState<InsumoMovementType>("entrada");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [min, setMin] = useState(meta.min);

  const registerMovement = () => {
    if (type !== "ajuste" && amount <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    let delta = amount;
    if (type === "saida" || type === "perda") delta = -Math.abs(amount);
    if (type === "entrada") delta = Math.abs(amount);
    if (type === "ajuste") delta = amount - total;
    if (delta === 0) {
      toast.error("O lançamento não altera o saldo.");
      return;
    }
    onMovement(type, delta, note.trim());
    setAmount(0);
    setNote("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-forest/10 bg-forest/[0.02] px-4 py-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="field-label">Saldo atual</p>
            <p className="mt-1 text-xs font-light text-forest/50">
              {insumo.category}
              {insumo.brand ? ` · ${insumo.brand}` : ""}
              {insumo.unitCost ? ` · ${formatBRL(insumo.unitCost)}/${insumo.unit}` : ""}
            </p>
          </div>
          <span className="text-[15px] font-semibold text-forest">
            {formatDecimal(total, 2)} <span className="text-base text-forest/50">{insumo.unit}</span>
          </span>
        </div>
      </div>

      <div>
        <p className="field-label mb-2">Registrar movimentação</p>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <select className={fieldControlClass} value={type} onChange={(e) => setType(e.target.value as InsumoMovementType)}>
            <option value="entrada">Entrada (+)</option>
            <option value="saida">Saída (−)</option>
            <option value="perda">Perda (−)</option>
            <option value="ajuste">Ajuste (novo saldo)</option>
          </select>
          <input
            type="number"
            min={0}
            step="0.01"
            className={fieldControlClass}
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder={type === "ajuste" ? "Novo saldo" : "Quantidade"}
          />
          <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={registerMovement}>
            Registrar
          </Button>
        </div>
        <input
          className={cn(fieldControlClass, "mt-2")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Observação (opcional) — ex.: nota fiscal, fornecedor…"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Estoque mínimo">
          <input type="number" min={0} step="0.01" className={fieldControlClass} value={min} onChange={(e) => setMin(Number(e.target.value))} />
        </Field>
        <Button variant="outline" className="h-10 px-4" onClick={() => onMeta(min)}>
          Salvar mínimo
        </Button>
      </div>

      <div>
        <p className="field-label mb-2 flex items-center gap-1.5">
          <History className="size-3.5" />
          Movimentações
        </p>
        {movements.length === 0 ? (
          <p className="py-3 text-sm font-light text-forest/45">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-b border-forest/5 py-1.5 text-sm last:border-0">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-forest/45">{formatShortDate(m.date.slice(0, 10))}</span>
                  <span className="text-forest/70">{INSUMO_MOVEMENT_LABELS[m.type]}</span>
                  {m.note ? <span className="text-xs font-light text-forest/45">· {m.note}</span> : null}
                </span>
                <span className={cn("font-medium tabular-nums", m.quantity >= 0 ? "text-forest" : "text-terracotta")}>
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
