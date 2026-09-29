"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import {
  BulkBar,
  confirmBulkDelete,
  ItemCheckbox,
  RecordRowActions,
  useItemSelection,
} from "@/components/cadastros/bulk";
import { ImportExport } from "@/components/cadastros/import-export";
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { SortableTh, compareSort, useColumnSort } from "@/components/cadastros/sort-header";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { VEHICLE_KIND_LABELS, VEHICLE_USAGE_CATEGORIES, VEHICLE_USAGE_CATEGORY_LABELS, type VehicleKind, type VehicleUsageCategory, type VeiculoRecord } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function VeiculosAdmin() {
  const { data, ready, upsertVeiculo, removeVeiculo, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [editing, setEditing] = useState<VeiculoRecord | null>(null);
  const [open, setOpen] = useState(false);
  const sort = useColumnSort<"name" | "plate" | "usage" | "kind" | "capacity">("name");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const list = [...data.veiculos].sort((a, b) => {
      const value = {
        name: a.name,
        plate: a.plate || "",
        usage: VEHICLE_USAGE_CATEGORY_LABELS[a.usageCategory],
        kind: VEHICLE_KIND_LABELS[a.kind],
        capacity: a.capacity || "",
      }[sort.key];
      const other = {
        name: b.name,
        plate: b.plate || "",
        usage: VEHICLE_USAGE_CATEGORY_LABELS[b.usageCategory],
        kind: VEHICLE_KIND_LABELS[b.kind],
        capacity: b.capacity || "",
      }[sort.key];
      return compareSort(value, other, sort.dir) || a.name.localeCompare(b.name, "pt-BR");
    });
    return list.filter((item) => {
      if (kindFilter && item.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.plate.toLowerCase().includes(term) ||
        item.model.toLowerCase().includes(term) ||
        item.chassis.toLowerCase().includes(term)
      );
    });
  }, [data, search, kindFilter, sort.key, sort.dir]);

  const selection = useItemSelection(filtered.map((item) => item.id));

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const duplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    duplicateMany("veiculos", ids);
    toast.success(ids.length === 1 ? "Veículo duplicado." : `${ids.length} veículos duplicados.`);
    selection.clear();
  };

  const removeSelected = () => {
    if (!confirmBulkDelete(selection.selectedVisible.length)) return;
    removeMany("veiculos", selection.selectedVisible);
    toast.success("Veículos excluídos.");
    selection.clear();
  };

  return (
    <PageShell>
      <CadastrosHeader
        title="Veículos"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ImportExport entity="veiculos" />
            <Button className="h-10 px-5" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo veículo
            </Button>
          </div>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastros indisponíveis" description="Recarregue a página." />
      ) : (
        <>
          <CatalogFilters
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por identificação, placa ou modelo…"
            facets={[
              {
                id: "kind",
                label: "Tipo",
                value: kindFilter,
                onChange: setKindFilter,
                options: Object.entries(VEHICLE_KIND_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
            ]}
          />
          <BulkBar
            count={selection.selectedVisible.length}
            noun="veículo"
            onDuplicate={() => duplicate(selection.selectedVisible)}
            onDelete={removeSelected}
            onClear={selection.clear}
          />
          {filtered.length === 0 ? (
            <EmptyBlock
              title="Nenhum veículo"
              description="Cadastre os veículos da frota ou importe de uma planilha."
              action={
                <Button className="h-10" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo veículo
                </Button>
              }
            />
          ) : (
            <Card flush className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="w-10 py-3 pl-5 pr-3">
                      <ItemCheckbox
                        label="Selecionar todos"
                        checked={selection.allVisibleSelected}
                        indeterminate={selection.someVisibleSelected}
                        onChange={selection.toggleAllVisible}
                      />
                    </th>
                    <SortableTh label="Veículo" active={sort.key === "name"} dir={sort.dir} onClick={() => sort.toggle("name")} />
                    <SortableTh label="Placa" active={sort.key === "plate"} dir={sort.dir} onClick={() => sort.toggle("plate")} />
                    <SortableTh label="Uso" active={sort.key === "usage"} dir={sort.dir} onClick={() => sort.toggle("usage")} />
                    <SortableTh label="Tipo" active={sort.key === "kind"} dir={sort.dir} onClick={() => sort.toggle("kind")} />
                    <SortableTh label="Capacidade" active={sort.key === "capacity"} dir={sort.dir} onClick={() => sort.toggle("capacity")} />
                    <th className="field-label py-3 pr-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-line last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5 pr-3">
                        <ItemCheckbox
                          label={`Selecionar ${item.name}`}
                          checked={selection.selected.has(item.id)}
                          onChange={() => selection.toggle(item.id)}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-forest">{item.name}</p>
                        {item.model || item.year ? (
                          <p className="meta-text mt-0.5">
                            {[item.model, item.year].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-forest/70 tabular">{item.plate || "—"}</td>
                      <td className="py-3 pr-3 text-forest/70">{VEHICLE_USAGE_CATEGORY_LABELS[item.usageCategory]}</td>
                      <td className="py-3 pr-3 text-forest/70">{VEHICLE_KIND_LABELS[item.kind]}</td>
                      <td className="py-3 pr-3 text-forest/70 tabular">{item.capacity || "—"}</td>
                      <td className="py-3 pr-5">
                        <RecordRowActions
                          label={item.name}
                          onEdit={() => {
                            setEditing(item);
                            setOpen(true);
                          }}
                          onDuplicate={() => duplicate([item.id])}
                          onDelete={() => {
                            if (window.confirm(`Excluir "${item.name}"?`)) {
                              removeVeiculo(item.id);
                              toast.success("Veículo excluído.");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {data ? (
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar veículo" : "Novo veículo"} wide>
          <VeiculoForm
            key={editing?.id ?? "new"}
            initial={editing}
            onCancel={() => setOpen(false)}
            onSubmit={(veiculo) => {
              upsertVeiculo(veiculo);
              toast.success(editing ? "Veículo atualizado." : "Veículo cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}

function VeiculoForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: VeiculoRecord | null;
  onSubmit: (veiculo: VeiculoRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [chassis, setChassis] = useState(initial?.chassis ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [kind, setKind] = useState<VehicleKind>(initial?.kind ?? "van");
  const [usageCategory, setUsageCategory] = useState<VehicleUsageCategory>(initial?.usageCategory ?? "misto");
  const [capacity, setCapacity] = useState(initial?.capacity ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    if (!name.trim() && !plate.trim()) {
      toast.error("Informe ao menos a identificação ou a placa.");
      return;
    }
    const stamp = new Date().toISOString();
    onSubmit({
      id: initial?.id ?? uid(),
      name: name.trim() || plate.trim(),
      plate: plate.trim(),
      model: model.trim(),
      chassis: chassis.trim(),
      year: year.trim(),
      kind,
      usageCategory,
      capacity: capacity.trim(),
      notes: notes.trim(),
      createdAt: initial?.createdAt ?? stamp,
      updatedAt: stamp,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Identificação / apelido" className="sm:col-span-2">
          <input
            className={fieldControlClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Van da cozinha"
          />
        </Field>
        <Field label="Placa">
          <input className={fieldControlClass} value={plate} onChange={(e) => setPlate(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <select
            className={fieldControlClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as VehicleKind)}
          >
            {Object.entries(VEHICLE_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modelo">
          <input className={fieldControlClass} value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
        <Field label="Chassi">
          <input className={fieldControlClass} value={chassis} onChange={(e) => setChassis(e.target.value)} />
        </Field>
        <Field label="Categoria de uso">
          <select
            className={fieldControlClass}
            value={usageCategory}
            onChange={(e) => setUsageCategory(e.target.value as VehicleUsageCategory)}
          >
            {VEHICLE_USAGE_CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ano">
          <input className={fieldControlClass} value={year} onChange={(e) => setYear(e.target.value)} />
        </Field>
        <Field label="Capacidade" className="sm:col-span-2">
          <input
            className={fieldControlClass}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Ex.: 1.000 kg / 8 m³"
          />
        </Field>
      </div>
      <Field label="Observações">
        <textarea
          className={cn(fieldControlClass, "min-h-20 py-2")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 px-5" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar veículo"}
        </Button>
      </div>
    </div>
  );
}
