"use client";

import { AlertTriangle, ArrowLeftRight, Download, History, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { balanceOf, computeBalances, getMeta, metaMap, movementsOf } from "@/lib/logistica/calc";
import { MOVEMENT_LABELS, type MovementType } from "@/lib/logistica/types";
import type { MaterialKind, MaterialRecord } from "@/lib/cadastros/types";
import { MATERIAL_KIND_LABELS, MATERIAL_KINDS } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { exportToXlsx } from "@/lib/cadastros/xlsx";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function EstoqueMateriais() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data: logistica, ready: logReady, addMovement, upsertMeta } = useLogistica();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<MaterialKind | "">("");
  const [selected, setSelected] = useState<MaterialRecord | null>(null);

  const balances = useMemo(
    () => computeBalances(logistica?.movements ?? []),
    [logistica],
  );
  const meta = useMemo(() => metaMap(logistica?.meta ?? []), [logistica]);

  const rows = useMemo(() => {
    if (!cadastros) return [];
    const term = search.trim().toLowerCase();
    return [...cadastros.materials]
      .filter((m) => (category ? m.category === category : true))
      .filter((m) => (kind ? m.kind === kind : true))
      .filter((m) => {
        if (!term) return true;
        return (
          m.name.toLowerCase().includes(term) ||
          m.variants.some((variant) => variant.toLowerCase().includes(term))
        );
      })
      .map((m) => {
        const stock = getMeta(meta, m.id);
        const balance = balanceOf(balances, m.id);
        return { material: m, balance, min: stock.min, location: stock.location };
      })
      .sort(
        (a, b) =>
          a.material.category.localeCompare(b.material.category, "pt-BR") ||
          a.material.name.localeCompare(b.material.name, "pt-BR"),
      );
  }, [cadastros, category, kind, search, meta, balances]);

  const belowMin = rows.filter((r) => r.min > 0 && r.balance < r.min).length;

  const ready = cadReady && logReady;

  const handleExport = async () => {
    if (!cadastros) return;
    const headers = ["Material", "Categoria", "Tipo", "Variantes", "Unidade", "Saldo", "Mínimo", "Local"];
    const data = rows.map((r) => [
      r.material.name,
      r.material.category,
      MATERIAL_KIND_LABELS[r.material.kind],
      r.material.variants.join("; "),
      r.material.unit,
      r.balance,
      r.min,
      r.location,
    ]);
    try {
      await exportToXlsx("estoque-materiais-casa-braga", "Estoque", headers, data);
      toast.success("Estoque exportado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível exportar.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Logística"
        title="Estoque de Materiais"
        description="Saldo atual de cada material, com mínimo, localização e movimentações. Variantes (marca, tipo) vêm do cadastro — o saldo é do material como um todo."
        action={
          <Button variant="outline" className="h-10 px-3" onClick={handleExport} disabled={!cadastros}>
            <Download data-icon="inline-start" />
            Exportar
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !cadastros || !logistica ? (
        <EmptyBlock title="Estoque indisponível" description="Recarregue a página." />
      ) : cadastros.materials.length === 0 ? (
        <EmptyBlock
          title="Nenhum material"
          description="Cadastre materiais em Cadastros → Materiais para controlar o estoque."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar material…" />
              </div>
              <select
                className={cn(fieldControlClass, "max-w-44")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {cadastros.materialCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className={cn(fieldControlClass, "max-w-44")}
                value={kind}
                onChange={(e) => setKind(e.target.value as MaterialKind | "")}
              >
                <option value="">Todos os tipos</option>
                {MATERIAL_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {MATERIAL_KIND_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            {belowMin > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-terracotta/10 px-3 py-1.5 text-sm text-terracotta">
                <AlertTriangle className="size-4" />
                {belowMin} abaixo do mínimo
              </span>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10">
                  <th className="field-label py-3 pl-5 font-normal">Material</th>
                  <th className="field-label py-3 text-right font-normal">Saldo</th>
                  <th className="field-label py-3 text-right font-normal">Mínimo</th>
                  <th className="field-label py-3 font-normal">Local</th>
                  <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ material, balance, min, location }) => {
                  const low = min > 0 && balance < min;
                  return (
                    <tr
                      key={material.id}
                      className={cn(
                        "border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]",
                        low && "bg-terracotta/[0.04]",
                      )}
                    >
                      <td className="py-3 pl-5">
                        <p className="font-list font-medium text-forest">{material.name}</p>
                        <p className="text-xs font-light text-forest/45">
                          {material.category} · {MATERIAL_KIND_LABELS[material.kind]}
                          {material.variants.length > 0 ? ` · ${material.variants.join(", ")}` : ""}
                        </p>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={cn(
                            "font-display text-lg",
                            low ? "text-terracotta" : "text-forest",
                          )}
                        >
                          {formatInt(balance)}
                        </span>
                        <span className="ml-1 text-xs font-light text-forest/45">
                          {material.unit}
                        </span>
                      </td>
                      <td className="py-3 text-right text-forest/60">{min || "—"}</td>
                      <td className="py-3 text-forest/60">
                        {location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5 text-forest/35" />
                            {location}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 pr-5">
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            onClick={() => setSelected(material)}
                          >
                            <ArrowLeftRight data-icon="inline-start" />
                            Gerenciar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && logistica ? (
        <Modal open onClose={() => setSelected(null)} title={selected.name} wide>
          <MaterialStockPanel
            key={selected.id}
            material={selected}
            balance={balanceOf(balances, selected.id)}
            meta={getMeta(meta, selected.id)}
            movements={movementsOf(logistica, selected.id)}
            onMovement={(type, delta, note) => {
              addMovement({
                id: uid(),
                materialId: selected.id,
                type,
                quantity: delta,
                date: new Date().toISOString(),
                note,
              });
              toast.success("Movimentação registrada.");
            }}
            onMeta={(min, location) => {
              upsertMeta({ materialId: selected.id, min, location });
              toast.success("Estoque atualizado.");
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function MaterialStockPanel({
  material,
  balance,
  meta,
  movements,
  onMovement,
  onMeta,
}: {
  material: MaterialRecord;
  balance: number;
  meta: { min: number; location: string };
  movements: import("@/lib/logistica/types").StockMovement[];
  onMovement: (type: MovementType, delta: number, note: string) => void;
  onMeta: (min: number, location: string) => void;
}) {
  const [type, setType] = useState<MovementType>("entrada");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [min, setMin] = useState(meta.min);
  const [location, setLocation] = useState(meta.location);

  const registerMovement = () => {
    if (type !== "ajuste" && amount <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    let delta = amount;
    if (type === "saida") delta = -Math.abs(amount);
    if (type === "entrada") delta = Math.abs(amount);
    if (type === "ajuste") delta = amount - balance; // amount = novo saldo
    if (delta === 0) {
      toast.error("O ajuste não altera o saldo.");
      return;
    }
    onMovement(type, delta, note.trim());
    setAmount(0);
    setNote("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between rounded-xl border border-forest/10 bg-forest/[0.02] px-4 py-3">
        <div>
          <p className="field-label">Saldo atual</p>
          <p className="mt-1 text-xs font-light text-forest/50">
            {MATERIAL_KIND_LABELS[material.kind]}
            {material.variants.length > 0 ? ` · ${material.variants.join(" · ")}` : ""}
          </p>
        </div>
        <span className="font-display text-3xl text-forest">
          {formatInt(balance)} <span className="text-base text-forest/50">{material.unit}</span>
        </span>
      </div>

      <div>
        <p className="field-label mb-2">Registrar movimentação</p>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
          <select
            className={fieldControlClass}
            value={type}
            onChange={(e) => setType(e.target.value as MovementType)}
          >
            <option value="entrada">Entrada (+)</option>
            <option value="saida">Saída (−)</option>
            <option value="ajuste">Ajuste (novo saldo)</option>
          </select>
          <input
            type="number"
            min={0}
            className={fieldControlClass}
            value={amount}
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

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Estoque mínimo">
          <input
            type="number"
            min={0}
            className={fieldControlClass}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
        </Field>
        <Field label="Localização">
          <input
            className={fieldControlClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex.: Prateleira A3"
          />
        </Field>
        <Button variant="outline" className="h-10 px-4" onClick={() => onMeta(min, location)}>
          Salvar
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
              <li
                key={m.id}
                className="flex items-center justify-between border-b border-forest/5 py-1.5 text-sm last:border-0"
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs text-forest/45">{formatShortDate(m.date.slice(0, 10))}</span>
                  <span className="text-forest/70">{MOVEMENT_LABELS[m.type]}</span>
                  {m.note ? <span className="text-xs font-light text-forest/45">· {m.note}</span> : null}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    m.quantity >= 0 ? "text-forest" : "text-terracotta",
                  )}
                >
                  {m.quantity >= 0 ? "+" : ""}
                  {formatInt(m.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
