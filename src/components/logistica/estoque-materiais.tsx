"use client";

import { AlertTriangle, ArrowDown, ArrowUp, ArrowLeftRight, Download, History, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import {
  computeBalances,
  getMeta,
  lastInventoryDate,
  listedVariants,
  materialTotal,
  metaMap,
  movementsOf,
  skuBalance,
  variantBreakdown,
} from "@/lib/logistica/calc";
import { MOVEMENT_LABELS, type MovementType } from "@/lib/logistica/types";
import type { MaterialKind, MaterialRecord } from "@/lib/cadastros/types";
import { MATERIAL_KIND_LABELS, MATERIAL_KINDS } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { exportToXlsx } from "@/lib/cadastros/xlsx";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type SortKey = "name" | "category" | "qty" | "location" | "lastCount";

function locationOf(
  material: MaterialRecord,
  metaLocation: string,
  names: Map<string, string>,
): string {
  if (material.locationId && names.has(material.locationId)) {
    return names.get(material.locationId) ?? "";
  }
  return metaLocation || "";
}

export function EstoqueMateriais() {
  const { data: cadastros, ready: cadReady, upsertMaterial } = useCadastros();
  const { data: logistica, ready: logReady, addMovement, upsertMeta } = useLogistica();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<MaterialKind | "">("");
  const [locationFilter, setLocationFilter] = useState("");
  const [countFilter, setCountFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<MaterialRecord | null>(null);

  const balances = useMemo(
    () => computeBalances(logistica?.movements ?? []),
    [logistica],
  );
  const meta = useMemo(() => metaMap(logistica?.meta ?? []), [logistica]);
  const locationNames = useMemo(
    () => new Map((cadastros?.stockLocations ?? []).map((item) => [item.id, item.name])),
    [cadastros],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "qty" || key === "lastCount" ? "desc" : "asc");
    }
  };

  const rows = useMemo(() => {
    if (!cadastros) return [];
    const term = search.trim().toLowerCase();
    const list = [...cadastros.materials]
      .filter((m) => (category ? m.category === category : true))
      .filter((m) => (kind ? m.kind === kind : true))
      .map((m) => {
        const stock = getMeta(meta, m.id);
        const location = locationOf(m, stock.location, locationNames);
        return {
          material: m,
          balance: materialTotal(balances, m.id),
          variants: variantBreakdown(balances, m.id, m.variants),
          min: stock.min,
          location,
          lastCount: lastInventoryDate(logistica?.inventories ?? [], m.id),
        };
      })
      .filter((row) => {
        if (locationFilter === "__none__") return !row.location;
        if (locationFilter) return row.location === locationNames.get(locationFilter);
        return true;
      })
      .filter((row) => {
        if (countFilter === "with") return Boolean(row.lastCount);
        if (countFilter === "without") return !row.lastCount;
        return true;
      })
      .filter((row) => {
        if (!term) return true;
        return (
          row.material.name.toLowerCase().includes(term) ||
          row.material.category.toLowerCase().includes(term) ||
          row.location.toLowerCase().includes(term) ||
          row.material.variants.some((variant) => variant.toLowerCase().includes(term))
        );
      });

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.material.name.localeCompare(b.material.name, "pt-BR");
      else if (sortKey === "category") {
        cmp =
          a.material.category.localeCompare(b.material.category, "pt-BR") ||
          a.material.name.localeCompare(b.material.name, "pt-BR");
      } else if (sortKey === "qty") cmp = a.balance - b.balance;
      else if (sortKey === "location") cmp = a.location.localeCompare(b.location, "pt-BR");
      else cmp = (a.lastCount ?? "").localeCompare(b.lastCount ?? "");
      return cmp * dir;
    });
    return list;
  }, [
    cadastros,
    category,
    kind,
    search,
    meta,
    balances,
    locationNames,
    locationFilter,
    countFilter,
    logistica?.inventories,
    sortKey,
    sortDir,
  ]);

  const belowMin = rows.filter((r) => r.min > 0 && r.balance < r.min).length;
  const ready = cadReady && logReady;

  const handleExport = async () => {
    if (!cadastros) return;
    const headers = [
      "Material",
      "Categoria",
      "Qtd total",
      "Por variação",
      "Local",
      "Última contagem",
      "Tipo",
      "Unidade",
    ];
    const data = rows.map((r) => [
      r.material.name,
      r.material.category,
      r.balance,
      r.variants.map((item) => `${item.label}: ${item.qty}`).join("; "),
      r.location,
      r.lastCount ? formatShortDate(r.lastCount) : "",
      MATERIAL_KIND_LABELS[r.material.kind],
      r.material.unit,
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
        description="Quantidade de cada variação e o total do material. Local na casa e data da última contagem. Cadastre os locais em Configurações do Módulo de Cadastros."
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
          <div className="flex flex-col gap-3">
            <CatalogFilters
              search={search}
              onSearch={setSearch}
              searchPlaceholder="Buscar material, categoria ou local…"
              facets={[
                {
                  id: "category",
                  label: "Categoria",
                  value: category,
                  onChange: setCategory,
                  options: cadastros.materialCategories.map((item) => ({
                    value: item,
                    label: item,
                  })),
                },
                {
                  id: "location",
                  label: "Local",
                  value: locationFilter,
                  onChange: setLocationFilter,
                  options: [
                    { value: "__none__", label: "Sem local" },
                    ...(cadastros.stockLocations ?? []).map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ],
                },
                {
                  id: "kind",
                  label: "Tipo",
                  value: kind,
                  onChange: (value) => setKind(value as MaterialKind | ""),
                  options: MATERIAL_KINDS.map((item) => ({
                    value: item,
                    label: MATERIAL_KIND_LABELS[item],
                  })),
                },
                {
                  id: "count",
                  label: "Última contagem",
                  value: countFilter,
                  onChange: setCountFilter,
                  options: [
                    { value: "with", label: "Já inventariado" },
                    { value: "without", label: "Nunca inventariado" },
                  ],
                },
              ]}
            />
            {belowMin > 0 ? (
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-terracotta/10 px-3 py-1.5 text-sm text-terracotta">
                <AlertTriangle className="size-4" />
                {belowMin} abaixo do mínimo
              </span>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-forest/10">
                  <SortTh
                    label="Material e categoria"
                    active={sortKey === "name" || sortKey === "category"}
                    dir={sortDir}
                    onClick={() => toggleSort(sortKey === "name" ? "category" : "name")}
                    className="pl-5"
                  />
                  <SortTh
                    label="Qtd disponível"
                    align="right"
                    active={sortKey === "qty"}
                    dir={sortDir}
                    onClick={() => toggleSort("qty")}
                  />
                  <SortTh
                    label="Local"
                    active={sortKey === "location"}
                    dir={sortDir}
                    onClick={() => toggleSort("location")}
                  />
                  <SortTh
                    label="Última contagem"
                    active={sortKey === "lastCount"}
                    dir={sortDir}
                    onClick={() => toggleSort("lastCount")}
                  />
                  <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm font-light text-forest/50">
                      Nenhum material com esses filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ material, balance, variants, min, location, lastCount }) => {
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
                          <p className="text-xs font-light text-forest/45">{material.category}</p>
                        </td>
                        <td className="py-3 text-right">
                          <p>
                            <span className={cn("font-display text-lg", low ? "text-terracotta" : "text-forest")}>
                              {formatInt(balance)}
                            </span>
                            <span className="ml-1 text-xs font-light text-forest/45">{material.unit}</span>
                          </p>
                          {variants.length > 0 ? (
                            <p className="mt-0.5 text-xs font-light text-forest/50">
                              {variants
                                .map((item) => `${item.label} ${formatInt(item.qty)}`)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </td>
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
                        <td className="py-3 text-forest/60">
                          {lastCount ? formatShortDate(lastCount) : "—"}
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && logistica && cadastros ? (
        <Modal open onClose={() => setSelected(null)} title={selected.name} wide>
          <MaterialStockPanel
            key={selected.id}
            material={selected}
            total={materialTotal(balances, selected.id)}
            variants={variantBreakdown(balances, selected.id, selected.variants)}
            skuBalance={(variant) => skuBalance(balances, selected.id, variant)}
            meta={getMeta(meta, selected.id)}
            locations={cadastros.stockLocations ?? []}
            lastCount={lastInventoryDate(logistica.inventories, selected.id)}
            movements={movementsOf(logistica, selected.id)}
            onMovement={(type, delta, note, variant) => {
              addMovement({
                id: uid(),
                materialId: selected.id,
                variant,
                type,
                quantity: delta,
                date: new Date().toISOString(),
                note,
              });
              toast.success("Movimentação registrada.");
            }}
            onMeta={(min, locationId) => {
              upsertMeta({
                materialId: selected.id,
                min,
                location: locationNames.get(locationId) ?? "",
              });
              upsertMaterial({
                ...selected,
                locationId: locationId || undefined,
                updatedAt: new Date().toISOString(),
              });
              toast.success("Estoque atualizado.");
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
        {active ? (
          dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : null}
      </button>
    </th>
  );
}

function MaterialStockPanel({
  material,
  total,
  variants,
  skuBalance: skuQty,
  meta,
  locations,
  lastCount,
  movements,
  onMovement,
  onMeta,
}: {
  material: MaterialRecord;
  total: number;
  variants: { variant: string; label: string; qty: number }[];
  skuBalance: (variant: string) => number;
  meta: { min: number; location: string };
  locations: { id: string; name: string }[];
  lastCount?: string;
  movements: import("@/lib/logistica/types").StockMovement[];
  onMovement: (type: MovementType, delta: number, note: string, variant: string) => void;
  onMeta: (min: number, locationId: string) => void;
}) {
  const hasVariants = listedVariants(material.variants).length > 0;
  const [type, setType] = useState<MovementType>("entrada");
  const [variant, setVariant] = useState(listedVariants(material.variants)[0] ?? "");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [min, setMin] = useState(meta.min);
  const [locationId, setLocationId] = useState(material.locationId ?? "");

  const registerMovement = () => {
    if (hasVariants && !variant) {
      toast.error("Escolha a variação.");
      return;
    }
    if (type !== "ajuste" && amount <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    let delta = amount;
    if (type === "saida") delta = -Math.abs(amount);
    if (type === "entrada") delta = Math.abs(amount);
    if (type === "ajuste") delta = amount - skuQty(variant);
    if (delta === 0) {
      toast.error("O ajuste não altera o saldo.");
      return;
    }
    onMovement(type, delta, note.trim(), variant);
    setAmount(0);
    setNote("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-forest/10 bg-forest/[0.02] px-4 py-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="field-label">Quantidade total</p>
            <p className="mt-1 text-xs font-light text-forest/50">
              {MATERIAL_KIND_LABELS[material.kind]}
              {lastCount ? ` · última contagem ${formatShortDate(lastCount)}` : " · ainda sem inventário"}
            </p>
          </div>
          <span className="font-display text-3xl text-forest">
            {formatInt(total)} <span className="text-base text-forest/50">{material.unit}</span>
          </span>
        </div>
        {variants.length > 0 ? (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {variants.map((item) => (
              <li
                key={item.variant || "__unclassified__"}
                className="flex items-baseline justify-between rounded-lg bg-white/70 px-3 py-1.5 text-sm"
              >
                <span className="text-forest/70">{item.label}</span>
                <span className="font-medium text-forest">
                  {formatInt(item.qty)} {material.unit}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <p className="field-label mb-2">Registrar movimentação</p>
        <div className={cn("grid gap-3", hasVariants ? "sm:grid-cols-[140px_1fr_1fr_auto]" : "sm:grid-cols-[140px_1fr_auto]")}>
          <select
            className={fieldControlClass}
            value={type}
            onChange={(e) => setType(e.target.value as MovementType)}
          >
            <option value="entrada">Entrada (+)</option>
            <option value="saida">Saída (−)</option>
            <option value="ajuste">Ajuste (novo saldo)</option>
          </select>
          {hasVariants ? (
            <select className={fieldControlClass} value={variant} onChange={(e) => setVariant(e.target.value)}>
              {listedVariants(material.variants).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {skuQty("") !== 0 ? <option value="">Não classificado</option> : null}
            </select>
          ) : null}
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
        <Field label="Local">
          <select
            className={fieldControlClass}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">Sem local definido</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="outline" className="h-10 px-4" onClick={() => onMeta(min, locationId)}>
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
                  {m.variant ? (
                    <span className="text-xs font-light text-forest/45">· {m.variant}</span>
                  ) : null}
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
