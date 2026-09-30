"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useCozinhaInsumos } from "@/components/cozinha/cozinha-insumos-provider";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card, CardHeader } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented";
import { todayIso } from "@/lib/cozinha/calc";
import { INSUMO_MOVEMENT_LABELS, type InsumoMovementType } from "@/lib/cozinha/types";
import { formatDecimal } from "@/lib/crm/format";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type FlowType = "entrada" | "saida";
type ListFilter = "todas" | InsumoMovementType;

const FILTERS: { key: ListFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "entrada", label: "Entradas" },
  { key: "saida", label: "Saídas" },
  { key: "inventario", label: "Inventário" },
  { key: "perda", label: "Perdas" },
  { key: "ajuste", label: "Ajustes" },
];

export function MovimentacoesEstoque() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data, ready: stockReady, addMovement } = useCozinhaInsumos();
  const [insumoId, setInsumoId] = useState("");
  const [type, setType] = useState<FlowType>("entrada");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("todas");
  const [dateSort, setDateSort] = useState<DateSort>("desc");

  const insumos = useMemo(
    () => [...(cadastros?.insumos ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [cadastros],
  );
  const insumoById = useMemo(() => new Map(insumos.map((item) => [item.id, item])), [insumos]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(data?.movements ?? [])]
      .filter((movement) => (filter === "todas" ? true : movement.type === filter))
      .filter((movement) => {
        if (!term) return true;
        const insumo = insumoById.get(movement.insumoId);
        return (
          insumo?.name.toLowerCase().includes(term) ||
          insumo?.category.toLowerCase().includes(term) ||
          (movement.note ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => compareDateSort(a.date, b.date, dateSort));
  }, [data, filter, search, dateSort, insumoById]);

  const ready = cadReady && stockReady;

  const register = () => {
    const insumo = insumoById.get(insumoId);
    const quantity = Number(amount);
    if (!insumo) {
      toast.error("Escolha o insumo.");
      return;
    }
    if (!(quantity > 0)) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    if (!date) {
      toast.error("Informe a data.");
      return;
    }
    addMovement({
      id: uid(),
      insumoId: insumo.id,
      type,
      quantity: type === "entrada" ? quantity : -quantity,
      date,
      note: note.trim(),
    });
    setAmount("");
    setNote("");
    toast.success(type === "entrada" ? "Entrada registrada." : "Saída registrada.");
  };

  return (
    <PageShell
      eyebrow="Cozinha"
      title="Movimentações no Estoque"
      description="Registre entradas de compra e saídas de uso. O saldo do estoque é a soma desses lançamentos."
    >

      {!ready ? (
        <LoadingBlock />
      ) : !cadastros || !data ? (
        <EmptyBlock title="Movimentações indisponíveis" description="Recarregue a página." />
      ) : insumos.length === 0 ? (
        <EmptyBlock
          title="Nenhum insumo"
          description="Cadastre insumos em Cadastros → Insumos para lançar entradas e saídas."
        />
      ) : (
        <>
          <Card className="space-y-4">
            <CardHeader title="Novo lançamento" />
            <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Insumo">
                <SearchableSelect
                  value={insumoId}
                  onChange={setInsumoId}
                  emptyLabel="Selecione"
                  searchPlaceholder="Pesquisar insumo…"
                  options={insumos.map((insumo) => ({ value: insumo.id, label: insumo.name }))}
                />
              </Field>
              <div className="space-y-1.5">
                <span className="field-label block">Tipo</span>
                <SegmentedControl<FlowType>
                  ariaLabel="Tipo"
                  className="flex w-full [&>button]:flex-1"
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "entrada", label: "Entrada" },
                    { value: "saida", label: "Saída" },
                  ]}
                />
              </div>
              <Field label="Quantidade">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={cn(fieldControlClass, "text-right tabular")}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Data">
                <input type="date" className={fieldControlClass} value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
            </div>
            <input
              className={fieldControlClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Observação (opcional) — nota fiscal, fornecedor, evento…"
            />
            <div className="flex justify-end">
              <Button className="px-5" onClick={register}>
                Registrar
              </Button>
            </div>
          </Card>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTERS.map((item) => (
                  <FilterChip key={item.key} active={filter === item.key} onClick={() => setFilter(item.key)}>
                    {item.label}
                  </FilterChip>
                ))}
              </div>
              <DateSortSelect value={dateSort} onChange={setDateSort} className="h-8" />
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar insumo ou observação…" />
            <Card flush>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="field-label py-3 pl-5 font-normal">Data</th>
                    <th className="field-label py-3 font-normal">Insumo</th>
                    <th className="field-label py-3 font-normal">Tipo</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="meta-text px-5 py-10 text-center">
                        Nenhuma movimentação com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((movement) => {
                      const insumo = insumoById.get(movement.insumoId);
                      return (
                        <tr key={movement.id} className="border-b border-line align-middle last:border-0">
                          <td className="py-3 pl-5 tabular text-forest/70">{formatShortDate(movement.date.slice(0, 10))}</td>
                          <td className="py-3">
                            <p className="text-forest">{insumo?.name ?? "Insumo removido"}</p>
                            {movement.note ? <p className="meta-text">{movement.note}</p> : null}
                          </td>
                          <td className="py-3 text-forest/70">{INSUMO_MOVEMENT_LABELS[movement.type]}</td>
                          <td
                            className={cn(
                              "whitespace-nowrap py-3 pr-5 text-right font-medium tabular",
                              movement.type === "perda" ? "text-danger" : movement.quantity >= 0 ? "text-forest" : "text-forest/70",
                            )}
                          >
                            {movement.quantity >= 0 ? "+" : ""}
                            {formatDecimal(movement.quantity, 2)}
                            {insumo ? <span className="meta-text ml-1 font-normal">{insumo.unit}</span> : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </Card>
          </section>
        </>
      )}
    </PageShell>
  );
}
