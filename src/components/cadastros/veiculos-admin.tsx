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
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { VEHICLE_KIND_LABELS, type VehicleKind, type VeiculoRecord } from "@/lib/cadastros/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function VeiculosAdmin() {
  const { data, ready, upsertVeiculo, removeVeiculo, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [editing, setEditing] = useState<VeiculoRecord | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const list = [...data.veiculos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return list.filter((item) => {
      if (kindFilter && item.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.plate.toLowerCase().includes(term) ||
        item.model.toLowerCase().includes(term)
      );
    });
  }, [data, search, kindFilter]);

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
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        title="Veículos"
        description="Frota da casa para a logística de entregas e transporte de material."
        action={
          <div className="flex flex-wrap gap-2">
            <ImportExport entity="veiculos" />
            <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
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
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo veículo
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="w-10 py-3 pl-5">
                      <ItemCheckbox
                        label="Selecionar todos"
                        checked={selection.allVisibleSelected}
                        indeterminate={selection.someVisibleSelected}
                        onChange={selection.toggleAllVisible}
                      />
                    </th>
                    <th className="field-label py-3 font-normal">Veículo</th>
                    <th className="field-label py-3 font-normal">Placa</th>
                    <th className="field-label py-3 font-normal">Tipo</th>
                    <th className="field-label py-3 font-normal">Capacidade</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5">
                        <ItemCheckbox
                          label={`Selecionar ${item.name}`}
                          checked={selection.selected.has(item.id)}
                          onChange={() => selection.toggle(item.id)}
                        />
                      </td>
                      <td className="py-3">
                        <p className="font-list font-medium text-forest">{item.name}</p>
                        {item.model || item.year ? (
                          <p className="text-xs font-light text-forest/45">
                            {[item.model, item.year].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 font-mono text-forest/70">{item.plate || "—"}</td>
                      <td className="py-3 text-forest/70">{VEHICLE_KIND_LABELS[item.kind]}</td>
                      <td className="py-3 text-forest/70">{item.capacity || "—"}</td>
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
            </div>
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
    </div>
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
  const [year, setYear] = useState(initial?.year ?? "");
  const [kind, setKind] = useState<VehicleKind>(initial?.kind ?? "van");
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
      year: year.trim(),
      kind,
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
      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={submit}>
          {initial ? "Salvar alterações" : "Cadastrar veículo"}
        </Button>
      </div>
    </div>
  );
}
