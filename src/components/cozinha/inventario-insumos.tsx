"use client";

import { FileDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { useCozinhaInsumos } from "@/components/cozinha/cozinha-insumos-provider";
import {
  downloadInsumoCountSheet,
  downloadInsumoInventoryPdf,
} from "@/components/cozinha/insumos-inventario-pdf";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatusPill } from "@/components/ui/status-pill";
import {
  computeInsumoBalances,
  getInsumoMeta,
  insumoBalance,
  insumoMetaMap,
  inventoryIsDue,
  latestInventory,
  nextCountDate,
  todayIso,
} from "@/lib/cozinha/calc";
import {
  INSUMO_INVENTORY_SCOPE_LABELS,
  type InsumoInventoryScope,
  type InsumoInventorySession,
} from "@/lib/cozinha/types";
import type { InsumoRecord } from "@/lib/cadastros/types";
import { formatDecimal } from "@/lib/crm/format";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const CYCLES: { scope: InsumoInventoryScope; cadence: string; hint: string }[] = [
  {
    scope: "semanal",
    cadence: "Toda semana",
    hint: "Insumos marcados como perecíveis no estoque.",
  },
  {
    scope: "mensal",
    cadence: "Todo mês",
    hint: "Os demais insumos, contados uma vez por mês.",
  },
];

export function InventarioInsumos() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data, ready: stockReady, concludeInventory, removeInventory } = useCozinhaInsumos();
  const [draftScope, setDraftScope] = useState<InsumoInventoryScope | null>(null);
  const [viewing, setViewing] = useState<InsumoInventorySession | null>(null);
  const [dateSort, setDateSort] = useState<DateSort>("desc");

  const balances = useMemo(() => computeInsumoBalances(data?.movements ?? []), [data]);
  const meta = useMemo(() => insumoMetaMap(data?.meta ?? []), [data]);
  const insumoById = useMemo(
    () => new Map((cadastros?.insumos ?? []).map((item) => [item.id, item])),
    [cadastros],
  );
  const ready = cadReady && stockReady;
  const today = todayIso();

  const itemsFor = (scope: InsumoInventoryScope) =>
    (cadastros?.insumos ?? []).filter((insumo) => {
      const perishable = getInsumoMeta(meta, insumo.id).perishable;
      return scope === "semanal" ? perishable : !perishable;
    });

  const printBlank = async (scope: InsumoInventoryScope) => {
    const rows = itemsFor(scope)
      .sort((a, b) => a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"))
      .map((insumo) => ({
        name: insumo.name,
        category: insumo.category,
        unit: insumo.unit,
        system: insumoBalance(balances, insumo.id),
      }));
    try {
      await downloadInsumoCountSheet({
        title: `Contagem · ${INSUMO_INVENTORY_SCOPE_LABELS[scope]}`,
        date: today,
        rows,
      });
      toast.success("Folha de contagem baixada.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  const remove = (session: InsumoInventorySession) => {
    if (!window.confirm(`Excluir a contagem de ${formatShortDate(session.date)}? O ajuste de estoque será desfeito.`)) {
      return;
    }
    removeInventory(session.id);
    setViewing((current) => (current?.id === session.id ? null : current));
    toast.success("Contagem excluída.");
  };

  if (!ready) {
    return (
      <PageShell eyebrow="Cozinha" title="Inventário de Insumos">
        <LoadingBlock />
      </PageShell>
    );
  }

  if (!cadastros || !data) {
    return (
      <PageShell eyebrow="Cozinha" title="Inventário de Insumos">
        <EmptyBlock title="Indisponível" description="Recarregue a página." />
      </PageShell>
    );
  }

  if (draftScope) {
    return (
      <CountForm
        scope={draftScope}
        insumos={itemsFor(draftScope)}
        balanceOf={(id) => insumoBalance(balances, id)}
        onCancel={() => setDraftScope(null)}
        onSave={(session) => {
          concludeInventory(session);
          setDraftScope(null);
          toast.success("Contagem lançada no estoque.");
        }}
      />
    );
  }

  const sessions = [...(data.inventories ?? [])].sort((a, b) => compareDateSort(a.date, b.date, dateSort));

  return (
    <PageShell
      eyebrow="Cozinha"
      title="Inventário de Insumos"
      description="A contagem física confere o que está na despensa com o saldo do sistema. Perecíveis entram toda semana; o restante, uma vez por mês."
    >

      <div className="grid gap-3 sm:grid-cols-2">
        {CYCLES.map((cycle) => {
          const last = latestInventory(data.inventories ?? [], cycle.scope);
          const due = inventoryIsDue(last?.date, cycle.scope, today);
          const next = nextCountDate(last?.date, cycle.scope);
          const count = itemsFor(cycle.scope).length;
          return (
            <Card as="article" key={cycle.scope} className="flex flex-col gap-3">
              <CardHeader
                title={INSUMO_INVENTORY_SCOPE_LABELS[cycle.scope]}
                description={
                  <>
                    {cycle.cadence} · <span className="tabular">{count}</span> {count === 1 ? "item" : "itens"}
                  </>
                }
                actions={<StatusPill tone={due ? "danger" : "ok"}>{due ? "Contagem pendente" : "Em dia"}</StatusPill>}
              />
              <p className="meta-text">{cycle.hint}</p>
              <p className="text-sm text-forest/70">
                {last
                  ? `Última contagem em ${formatShortDate(last.date)}${next ? ` · próxima ${formatShortDate(next)}` : ""}`
                  : "Ainda não houve contagem."}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  className="px-4"
                  disabled={count === 0}
                  onClick={() => setDraftScope(cycle.scope)}
                >
                  Contar agora
                </Button>
                <Button variant="outline" className="px-3" disabled={count === 0} onClick={() => printBlank(cycle.scope)}>
                  <FileDown data-icon="inline-start" />
                  Folha
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <CardHeader
          title="Contagens realizadas"
          actions={sessions.length > 0 ? <DateSortSelect value={dateSort} onChange={setDateSort} className="h-8" /> : null}
        />
        {sessions.length === 0 ? (
          <EmptyBlock title="Nenhuma contagem" description="A primeira contagem zera a diferença entre a despensa e o sistema." />
        ) : (
          <Card flush>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="field-label py-3 pl-5 font-normal">Data</th>
                  <th className="field-label py-3 font-normal">Ciclo</th>
                  <th className="field-label py-3 font-normal">Responsável</th>
                  <th className="field-label py-3 pr-5 text-right font-normal">Itens</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const diffs = session.items.filter((item) => item.counted !== item.previous).length;
                  return (
                    <tr
                      key={session.id}
                      className="cursor-pointer border-b border-line last:border-0 hover:bg-forest/[0.02]"
                      onClick={() => setViewing(session)}
                    >
                      <td className="py-3 pl-5 tabular text-forest">{formatShortDate(session.date)}</td>
                      <td className="py-3 text-forest">{INSUMO_INVENTORY_SCOPE_LABELS[session.scope]}</td>
                      <td className="py-3 text-forest/70">{session.responsible || "—"}</td>
                      <td className="py-3 pr-5 text-right tabular text-forest">
                        {diffs > 0 ? <StatusPill tone="warn" className="mr-2">{diffs} com diferença</StatusPill> : null}
                        {session.items.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </Card>
        )}
      </section>

      {viewing ? (
        <Modal open title={`Contagem de ${formatShortDate(viewing.date)}`} onClose={() => setViewing(null)} wide>
          <SessionDetail
            session={viewing}
            insumoById={insumoById}
            onDelete={() => remove(viewing)}
            onPdf={async () => {
              try {
                await downloadInsumoInventoryPdf({
                  title: `Inventário · ${INSUMO_INVENTORY_SCOPE_LABELS[viewing.scope]}`,
                  date: viewing.date,
                  responsible: viewing.responsible,
                  rows: viewing.items.map((item) => {
                    const insumo = insumoById.get(item.insumoId);
                    return {
                      name: insumo?.name ?? "Insumo removido",
                      category: insumo?.category ?? "Outros",
                      unit: insumo?.unit ?? "",
                      system: item.previous,
                      counted: item.counted,
                    };
                  }),
                });
                toast.success("PDF baixado.");
              } catch (error) {
                console.error(error);
                toast.error("Não foi possível gerar o PDF.");
              }
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}

function CountForm({
  scope,
  insumos,
  balanceOf,
  onCancel,
  onSave,
}: {
  scope: InsumoInventoryScope;
  insumos: InsumoRecord[];
  balanceOf: (id: string) => number;
  onCancel: () => void;
  onSave: (session: InsumoInventorySession) => void;
}) {
  const [date, setDate] = useState(todayIso);
  const [responsible, setResponsible] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});

  const visible = insumos
    .filter((insumo) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return insumo.name.toLowerCase().includes(term) || insumo.category.toLowerCase().includes(term);
    })
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"));

  const save = () => {
    const items = insumos.flatMap((insumo) => {
      const raw = counts[insumo.id];
      if (raw == null || raw.trim() === "") return [];
      const counted = Number(raw);
      if (!Number.isFinite(counted) || counted < 0) return [];
      return [{ insumoId: insumo.id, previous: balanceOf(insumo.id), counted }];
    });
    if (items.length === 0) {
      toast.error("Informe a quantidade contada de ao menos um insumo.");
      return;
    }
    onSave({
      id: uid(),
      date: date || todayIso(),
      scope,
      responsible: responsible.trim(),
      note: note.trim(),
      items,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <PageShell
      eyebrow="Cozinha"
      title={`Contagem · ${INSUMO_INVENTORY_SCOPE_LABELS[scope]}`}
      actions={
        <Button variant="outline" className="px-3" onClick={onCancel}>
          Voltar
        </Button>
      }
    >
      <Card className="grid gap-3 sm:grid-cols-3">
        <Field label="Data">
          <input type="date" className={fieldControlClass} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Responsável">
          <input className={fieldControlClass} value={responsible} onChange={(event) => setResponsible(event.target.value)} />
        </Field>
        <Field label="Observação">
          <input className={fieldControlClass} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </Card>
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar insumo…" />
      <Card flush>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="field-label py-3 pl-5 font-normal">Insumo</th>
              <th className="field-label w-32 py-3 text-right font-normal">Sistema</th>
              <th className="field-label w-36 py-3 pl-4 text-right font-normal">Contado</th>
              <th className="field-label w-28 py-3 pr-5 text-right font-normal">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((insumo) => {
              const system = balanceOf(insumo.id);
              const raw = counts[insumo.id] ?? "";
              const counted = raw.trim() === "" ? null : Number(raw);
              const delta = counted != null && Number.isFinite(counted) ? counted - system : null;
              return (
                <tr
                  key={insumo.id}
                  className={cn("border-b border-line align-middle last:border-0", delta != null && delta !== 0 && "row-edited")}
                >
                  <td className="py-2 pl-5">
                    <p className="text-forest">{insumo.name}</p>
                    <p className="meta-text">{insumo.category}</p>
                  </td>
                  <td className="py-2 text-right tabular text-forest/70">
                    {formatDecimal(system, 2)} <span className="meta-text">{insumo.unit}</span>
                  </td>
                  <td className="py-2 pl-4 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`Contado de ${insumo.name}`}
                      className={cn(fieldControlClass, "ml-auto block h-9 w-28 px-2 text-right tabular")}
                      value={raw}
                      onChange={(event) => setCounts((current) => ({ ...current, [insumo.id]: event.target.value }))}
                    />
                  </td>
                  <td className="py-2 pr-5 text-right tabular">
                    {delta != null && delta !== 0 ? (
                      <span className={delta > 0 ? "text-forest" : "text-danger"}>
                        {delta > 0 ? "+" : ""}
                        {formatDecimal(delta, 2)}
                      </span>
                    ) : (
                      <span className="text-forest/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button className="px-5" onClick={save}>
          Lançar contagem
        </Button>
      </div>
    </PageShell>
  );
}

function SessionDetail({
  session,
  insumoById,
  onDelete,
  onPdf,
}: {
  session: InsumoInventorySession;
  insumoById: Map<string, InsumoRecord>;
  onDelete: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="meta-text">
        {INSUMO_INVENTORY_SCOPE_LABELS[session.scope]}
        {session.responsible ? ` · ${session.responsible}` : ""}
        {session.note ? ` · ${session.note}` : ""}
      </p>
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {session.items.map((item) => {
          const insumo = insumoById.get(item.insumoId);
          const delta = item.counted - item.previous;
          return (
            <li key={item.insumoId} className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
              <span className="min-w-0 text-forest">{insumo?.name ?? "Insumo removido"}</span>
              <span className="shrink-0 tabular text-forest/70">
                {formatDecimal(item.previous, 2)} → {formatDecimal(item.counted, 2)}
                {delta !== 0 ? (
                  <span className={cn("ml-2", delta > 0 ? "text-forest" : "text-danger")}>
                    {delta > 0 ? "+" : ""}
                    {formatDecimal(delta, 2)}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between gap-2">
        <Button variant="destructive" className="px-3" onClick={onDelete}>
          <Trash2 data-icon="inline-start" />
          Excluir
        </Button>
        <Button variant="outline" className="px-3" onClick={onPdf}>
          <FileDown data-icon="inline-start" />
          PDF
        </Button>
      </div>
    </div>
  );
}
