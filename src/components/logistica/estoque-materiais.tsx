"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Download, History } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useLogistica } from "@/components/logistica/logistica-provider";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatusPill } from "@/components/ui/status-pill";
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
import type { MaterialRecord } from "@/lib/cadastros/types";
import { MATERIAL_KIND_LABELS } from "@/lib/cadastros/types";
import { formatInt } from "@/lib/crm/format";
import { exportToXlsx } from "@/lib/cadastros/xlsx";
import { uid } from "@/lib/event-factory";
import { formatShortDate } from "@/lib/dates";
import { openDataUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type SortKey = "name" | "qty" | "location";

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
  const [locationFilter, setLocationFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
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
      setSortDir(key === "qty" ? "desc" : "asc");
    }
  };

  const rows = useMemo(() => {
    if (!cadastros) return [];
    const term = search.trim().toLowerCase();
    const list = [...cadastros.materials]
      .filter((m) => (category ? m.category === category : true))
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
      if (sortKey === "qty") cmp = a.balance - b.balance;
      else if (sortKey === "location") cmp = a.location.localeCompare(b.location, "pt-BR");
      else {
        cmp =
          a.material.category.localeCompare(b.material.category, "pt-BR") ||
          a.material.name.localeCompare(b.material.name, "pt-BR");
      }
      return cmp * dir;
    });
    return list;
  }, [
    cadastros,
    category,
    search,
    meta,
    balances,
    locationNames,
    locationFilter,
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
      "Quantidade total",
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
    <PageShell
      eyebrow="Logística"
      title="Estoque de Materiais"
      actions={
        <Button variant="outline" className="h-10 px-3" onClick={handleExport} disabled={!cadastros}>
          <Download data-icon="inline-start" />
          Exportar
        </Button>
      }
    >

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
              compact
              search={search}
              onSearch={setSearch}
              searchPlaceholder="Buscar…"
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
              ]}
            />
            {belowMin > 0 ? (
              <StatusPill tone="danger" className="gap-1.5 self-start tabular">
                <AlertTriangle className="size-3.5" />
                {belowMin} abaixo do mínimo
              </StatusPill>
            ) : null}
          </div>

          <Card flush>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <SortTh
                    label="Material"
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                    className="pl-4 sm:pl-5"
                  />
                  <SortTh
                    label="Quantidade"
                    align="center"
                    active={sortKey === "qty"}
                    dir={sortDir}
                    onClick={() => toggleSort("qty")}
                  />
                  <SortTh
                    label="Local"
                    align="center"
                    active={sortKey === "location"}
                    dir={sortDir}
                    onClick={() => toggleSort("location")}
                    className="pr-4 sm:pr-5"
                  />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="meta-text px-5 py-10 text-center">
                      Nenhum material com esses filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ material, balance, min, location }) => {
                    const low = min > 0 && balance < min;
                    return (
                      <tr
                        key={material.id}
                        tabIndex={0}
                        onClick={() => setSelected(material)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(material);
                          }
                        }}
                        className={cn(
                          "cursor-pointer border-b border-line last:border-0 hover:bg-forest/[0.02]",
                          low && "bg-danger/[0.04]",
                        )}
                      >
                        <td className="py-3 pl-4 sm:pl-5">
                          <div className="flex items-center gap-3">
                            {material.photoDataUrl ? (
                              <button
                                type="button"
                                title="Abrir foto"
                                className="shrink-0"
                                onClick={(click) => {
                                  click.stopPropagation();
                                  openDataUrl(material.photoDataUrl!);
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={material.photoDataUrl}
                                  alt=""
                                  className="size-10 rounded-md object-cover"
                                />
                              </button>
                            ) : null}
                            <div className="min-w-0">
                              <p className="text-forest">{material.name}</p>
                              <p className="meta-text">{material.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <span className={cn("tabular", low ? "font-medium text-danger" : "text-forest")}>
                            {formatInt(balance)}
                          </span>
                          <span className="meta-text ml-1">{material.unit}</span>
                        </td>
                        <td className="py-3 pr-4 text-center text-forest/60 sm:pr-5">{location || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
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
  align?: "right" | "center";
  className?: string;
}) {
  return (
    <th className={cn("field-label py-3 font-normal", align === "right" && "text-right", align === "center" && "text-center", className)}>
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
      <div className="surface-card px-4 py-3">
        <div className="flex items-start gap-3">
          {material.photoDataUrl ? (
            <button
              type="button"
              title="Abrir foto"
              className="shrink-0"
              onClick={() => openDataUrl(material.photoDataUrl!)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={material.photoDataUrl}
                alt=""
                className="size-16 rounded-md object-cover"
              />
            </button>
          ) : null}
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="field-label">Quantidade total</p>
              <p className="meta-text mt-1">
                {MATERIAL_KIND_LABELS[material.kind]}
                {lastCount ? ` · última contagem ${formatShortDate(lastCount)}` : " · ainda sem inventário"}
              </p>
            </div>
            <span className="section-title shrink-0 tabular">
              {formatInt(total)} <span className="font-normal text-forest/50">{material.unit}</span>
            </span>
          </div>
        </div>
        {variants.length > 0 ? (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {variants.map((item) => (
              <li
                key={item.variant || "__unclassified__"}
                className="flex items-baseline justify-between gap-3 rounded-md border border-line bg-white px-3 py-1.5 text-sm"
              >
                <span className="text-forest/70">{item.label}</span>
                <span className="font-medium text-forest tabular">
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
            className={cn(fieldControlClass, "text-right tabular")}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder={type === "ajuste" ? "Novo saldo" : "Quantidade"}
          />
          <Button className="h-10 px-5" onClick={registerMovement}>
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
            className={cn(fieldControlClass, "text-right tabular")}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
        </Field>
        <Field label="Local">
          <SearchableSelect
            value={locationId}
            onChange={setLocationId}
            emptyLabel="Sem local definido"
            searchPlaceholder="Pesquisar local…"
            options={locations.map((location) => ({ value: location.id, label: location.name }))}
          />
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
          <p className="meta-text py-3">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <span className="meta-text tabular">{formatShortDate(m.date.slice(0, 10))}</span>
                  <span className="text-forest/70">{MOVEMENT_LABELS[m.type]}</span>
                  {m.variant ? (
                    <span className="meta-text">· {m.variant}</span>
                  ) : null}
                  {m.note ? <span className="meta-text">· {m.note}</span> : null}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-medium tabular",
                    m.quantity >= 0 ? "text-forest" : "text-forest/60",
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
