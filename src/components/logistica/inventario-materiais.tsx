"use client";

import { ArrowLeft, ClipboardCheck, Eye, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { balanceOf, computeBalances } from "@/lib/logistica/calc";
import type { InventorySession } from "@/lib/logistica/types";
import { formatInt } from "@/lib/crm/format";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function InventarioMateriais() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady, concludeInventory } = useLogistica();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [viewing, setViewing] = useState<InventorySession | null>(null);

  const balances = useMemo(() => computeBalances(logistica?.movements ?? []), [logistica]);
  const materialName = useMemo(
    () => new Map((cadastros?.materials ?? []).map((m) => [m.id, m.name])),
    [cadastros],
  );

  const ready = cadReady && logReady;

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <CadastrosHeader eyebrow="Logística" title="Inventário de Materiais" description="Contagem física do estoque." />
        <LoadingBlock />
      </div>
    );
  }

  if (!cadastros || !logistica) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <CadastrosHeader eyebrow="Logística" title="Inventário de Materiais" description="Contagem física do estoque." />
        <EmptyBlock title="Indisponível" description="Recarregue a página." />
      </div>
    );
  }

  if (mode === "new") {
    return (
      <NewInventory
        materials={cadastros.materials}
        balances={balances}
        onCancel={() => setMode("list")}
        onConclude={(session) => {
          concludeInventory(session);
          setMode("list");
          toast.success("Inventário concluído — estoque atualizado.");
        }}
      />
    );
  }

  const inventories = [...logistica.inventories].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Logística"
        title="Inventário de Materiais"
        description="Faça a contagem física do estoque. Ao concluir, o saldo é ajustado automaticamente e a contagem fica no histórico."
        action={
          <Button
            className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
            onClick={() => setMode("new")}
            disabled={cadastros.materials.length === 0}
          >
            <Plus data-icon="inline-start" />
            Novo inventário
          </Button>
        }
      />

      {inventories.length === 0 ? (
        <EmptyBlock
          title="Nenhum inventário"
          description="Faça a primeira contagem física para acertar o saldo do estoque."
          action={
            <Button
              className="bg-forest text-cream hover:bg-petrol"
              onClick={() => setMode("new")}
              disabled={cadastros.materials.length === 0}
            >
              <Plus data-icon="inline-start" />
              Novo inventário
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forest/10">
                <th className="field-label py-3 pl-5 font-normal">Data</th>
                <th className="field-label py-3 font-normal">Responsável</th>
                <th className="field-label py-3 text-right font-normal">Itens</th>
                <th className="field-label py-3 text-right font-normal">Ajustes</th>
                <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((session) => {
                const changed = session.items.filter((i) => i.counted !== i.previous).length;
                return (
                  <tr key={session.id} className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]">
                    <td className="py-3 pl-5 font-list text-forest">{formatShortDate(session.date.slice(0, 10))}</td>
                    <td className="py-3 text-forest/70">{session.responsible || "—"}</td>
                    <td className="py-3 text-right text-forest/70">{session.items.length}</td>
                    <td className="py-3 text-right text-forest/70">{changed}</td>
                    <td className="py-3 pr-5 text-right">
                      <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setViewing(session)}>
                        <Eye data-icon="inline-start" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing ? (
        <Modal open onClose={() => setViewing(null)} title={`Inventário · ${formatShortDate(viewing.date.slice(0, 10))}`} wide>
          <div className="space-y-3">
            {viewing.responsible ? (
              <p className="text-sm text-forest/60">Responsável: {viewing.responsible}</p>
            ) : null}
            {viewing.note ? <p className="text-sm font-light text-forest/60">{viewing.note}</p> : null}
            <div className="overflow-hidden rounded-xl border border-forest/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10 bg-forest/[0.02]">
                    <th className="field-label py-2 pl-4 font-normal">Material</th>
                    <th className="field-label py-2 text-right font-normal">Anterior</th>
                    <th className="field-label py-2 text-right font-normal">Contado</th>
                    <th className="field-label py-2 pr-4 text-right font-normal">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item) => {
                    const diff = item.counted - item.previous;
                    return (
                      <tr key={item.materialId} className="border-b border-forest/5 last:border-0">
                        <td className="py-2 pl-4 text-forest">{materialName.get(item.materialId) ?? item.materialId}</td>
                        <td className="py-2 text-right text-forest/60">{formatInt(item.previous)}</td>
                        <td className="py-2 text-right text-forest">{formatInt(item.counted)}</td>
                        <td
                          className={cn(
                            "py-2 pr-4 text-right font-medium",
                            diff === 0 ? "text-forest/40" : diff > 0 ? "text-forest" : "text-terracotta",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatInt(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function NewInventory({
  materials,
  balances,
  onConclude,
  onCancel,
}: {
  materials: import("@/lib/cadastros/types").MaterialRecord[];
  balances: Map<string, number>;
  onConclude: (session: InventorySession) => void;
  onCancel: () => void;
}) {
  const [responsible, setResponsible] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(materials.map((m) => [m.id, balanceOf(balances, m.id)])),
  );

  const categories = useMemo(
    () => [...new Set(materials.map((m) => m.category))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [materials],
  );

  const visible = useMemo(
    () =>
      [...materials]
        .filter((m) => (category ? m.category === category : true))
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
        ),
    [materials, category],
  );

  const changedCount = materials.filter(
    (m) => (counts[m.id] ?? 0) !== balanceOf(balances, m.id),
  ).length;

  const conclude = () => {
    const items = materials.map((m) => ({
      materialId: m.id,
      previous: balanceOf(balances, m.id),
      counted: counts[m.id] ?? 0,
    }));
    const stamp = new Date().toISOString();
    onConclude({
      id: uid(),
      date: stamp,
      responsible: responsible.trim(),
      note: note.trim(),
      items,
      createdAt: stamp,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-light text-forest/60 hover:text-forest"
        >
          <ArrowLeft className="size-4" />
          Voltar ao histórico
        </button>
        <h1 className="font-display mt-3 text-4xl text-forest sm:text-5xl">Novo inventário</h1>
        <p className="mt-2 text-sm font-light text-forest/60">
          Preencha a contagem física. A diferença aparece ao lado; ao concluir, o saldo é ajustado.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-forest/10 bg-white p-4 sm:grid-cols-3">
        <Field label="Responsável">
          <input className={fieldControlClass} value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </Field>
        <Field label="Observação">
          <input className={fieldControlClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Field label="Filtrar categoria">
          <select className={fieldControlClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-forest/60">
          {changedCount > 0 ? `${changedCount} item(ns) com diferença` : "Sem diferenças até agora"}
        </p>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={conclude}>
          <ClipboardCheck data-icon="inline-start" />
          Concluir inventário
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-forest/10">
              <th className="field-label py-3 pl-5 font-normal">Material</th>
              <th className="field-label py-3 text-right font-normal">Saldo atual</th>
              <th className="field-label py-3 font-normal">Contagem</th>
              <th className="field-label py-3 pr-5 text-right font-normal">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const previous = balanceOf(balances, m.id);
              const counted = counts[m.id] ?? 0;
              const diff = counted - previous;
              return (
                <tr key={m.id} className="border-b border-forest/5 last:border-0">
                  <td className="py-2.5 pl-5">
                    <p className="font-list font-medium text-forest">{m.name}</p>
                    <p className="text-xs font-light text-forest/45">
                      {m.category} · {m.unit}
                    </p>
                  </td>
                  <td className="py-2.5 text-right text-forest/60">{formatInt(previous)}</td>
                  <td className="py-2.5">
                    <input
                      type="number"
                      min={0}
                      className={cn(fieldControlClass, "h-9 w-28")}
                      value={counted}
                      onChange={(e) =>
                        setCounts((current) => ({ ...current, [m.id]: Number(e.target.value) }))
                      }
                    />
                  </td>
                  <td
                    className={cn(
                      "py-2.5 pr-5 text-right font-medium",
                      diff === 0 ? "text-forest/40" : diff > 0 ? "text-forest" : "text-terracotta",
                    )}
                  >
                    {diff > 0 ? "+" : ""}
                    {formatInt(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
