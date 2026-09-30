"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SegmentedControl } from "@/components/ui/segmented";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import {
  checklistForKind,
  emptyMeeting,
  markChecklist,
  MEETING_KIND_LABELS,
  MEETING_STATUS_LABELS,
  MEETING_STATUSES,
  type MeetingKind,
  type MeetingRecord,
  type MeetingStatus,
} from "@/lib/compromissos/types";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function MeetingForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: MeetingRecord;
  onSubmit: (meeting: MeetingRecord) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { data: cadastros } = useCadastros();
  const [draft, setDraft] = useState(initial);
  const [extraLabel, setExtraLabel] = useState("");
  const locais = [...(cadastros?.locais ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const veiculos = [...(cadastros?.veiculos ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const clientes = [...(cadastros?.clientes ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const patch = (partial: Partial<MeetingRecord>) => setDraft((current) => ({ ...current, ...partial }));

  const setKind = (kind: MeetingKind) => {
    setDraft((current) => ({
      ...current,
      kind,
      checklist: checklistForKind(kind, current.checklist),
    }));
  };

  const submit = () => {
    if (!draft.title.trim()) {
      toast.error("Informe o assunto da reunião.");
      return;
    }
    if (!draft.date) {
      toast.error("Informe a data.");
      return;
    }
    onSubmit(
      emptyMeeting({
        ...draft,
        title: draft.title.trim(),
        salon: draft.salon.trim(),
        address: draft.address.trim(),
        attendees: draft.attendees.trim(),
        driverName: draft.driverName.trim(),
        notes: draft.notes.trim(),
        updatedAt: new Date().toISOString(),
      }),
    );
  };

  return (
    <div className="space-y-5">
      <Field label="★ Assunto">
        <input
          className={fieldControlClass}
          value={draft.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder="Ex.: Reunião com fornecedor"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="field-label">Tipo</span>
          <SegmentedControl
            ariaLabel="Tipo de reunião"
            value={draft.kind}
            onChange={setKind}
            options={Object.entries(MEETING_KIND_LABELS).map(([value, label]) => ({
              value: value as MeetingKind,
              label,
            }))}
          />
        </div>
        <Field label="Status">
          <select
            className={fieldControlClass}
            value={draft.status}
            onChange={(event) => patch({ status: event.target.value as MeetingStatus })}
          >
            {MEETING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {MEETING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="★ Data">
          <input
            type="date"
            className={cn(fieldControlClass, "tabular")}
            value={draft.date}
            onChange={(event) => patch({ date: event.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início">
            <input
              type="time"
              className={cn(fieldControlClass, "tabular")}
              value={draft.startTime}
              onChange={(event) => patch({ startTime: event.target.value })}
            />
          </Field>
          <Field label="Fim">
            <input
              type="time"
              className={cn(fieldControlClass, "tabular")}
              value={draft.endTime}
              onChange={(event) => patch({ endTime: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Cliente">
          <SearchableSelect
            value={draft.clientId}
            onChange={(clientId) => patch({ clientId })}
            emptyLabel="Sem cliente"
            searchPlaceholder="Pesquisar cliente…"
            options={clientes.map((cliente) => ({ value: cliente.id, label: cliente.name }))}
          />
        </Field>
        <Field label="Participantes">
          <input
            className={fieldControlClass}
            value={draft.attendees}
            onChange={(event) => patch({ attendees: event.target.value })}
            placeholder="Nomes de quem participa"
          />
        </Field>
      </div>

      {draft.kind === "interna" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Local cadastrado">
            <SearchableSelect
              value={draft.locationId}
              onChange={(locationId) => {
                const local = locais.find((item) => item.id === locationId);
                setDraft((current) => ({
                  ...current,
                  locationId,
                  address: local?.address || current.address,
                  checklist: markChecklist(current.checklist, "salao", Boolean(locationId || current.salon)),
                }));
              }}
              emptyLabel="Casa Braga / outro"
              searchPlaceholder="Pesquisar local…"
              options={locais.map((local) => ({ value: local.id, label: local.name }))}
            />
          </Field>
          <Field label="Salão">
            <input
              className={fieldControlClass}
              value={draft.salon}
              onChange={(event) => {
                const salon = event.target.value;
                setDraft((current) => ({
                  ...current,
                  salon,
                  checklist: markChecklist(current.checklist, "salao", Boolean(salon.trim() || current.locationId)),
                }));
              }}
              placeholder="Ex.: Salão principal, varanda…"
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Local cadastrado">
            <SearchableSelect
              value={draft.locationId}
              onChange={(locationId) => {
                const local = locais.find((item) => item.id === locationId);
                setDraft((current) => ({
                  ...current,
                  locationId,
                  address: local?.address || current.address,
                  checklist: markChecklist(current.checklist, "endereco", Boolean(local?.address || current.address)),
                }));
              }}
              emptyLabel="Outro endereço"
              searchPlaceholder="Pesquisar local…"
              options={locais.map((local) => ({ value: local.id, label: local.name }))}
            />
          </Field>
          <Field label="Endereço">
            <input
              className={fieldControlClass}
              value={draft.address}
              onChange={(event) => {
                const address = event.target.value;
                setDraft((current) => ({
                  ...current,
                  address,
                  checklist: markChecklist(current.checklist, "endereco", Boolean(address.trim())),
                }));
              }}
              placeholder="Rua, número, bairro"
            />
          </Field>
          <Field label="Veículo">
            <SearchableSelect
              value={draft.vehicleId}
              onChange={(vehicleId) => {
                setDraft((current) => ({
                  ...current,
                  vehicleId,
                  checklist: markChecklist(current.checklist, "veiculo", Boolean(vehicleId)),
                }));
              }}
              emptyLabel="Sem veículo"
              searchPlaceholder="Pesquisar veículo…"
              options={veiculos.map((veiculo) => ({
                value: veiculo.id,
                label: veiculo.name,
                hint: veiculo.plate || undefined,
              }))}
            />
          </Field>
          <Field label="Motorista">
            <input
              className={fieldControlClass}
              value={draft.driverName}
              onChange={(event) => {
                const driverName = event.target.value;
                setDraft((current) => ({
                  ...current,
                  driverName,
                  checklist: markChecklist(current.checklist, "motorista", Boolean(driverName.trim())),
                }));
              }}
              placeholder="Nome de quem dirige"
            />
          </Field>
        </div>
      )}

      <div>
        <h3 className="section-title mb-1">O que precisa estar pronto</h3>
        <p className="meta-text mb-3">
          {draft.kind === "interna"
            ? "Reunião na casa: salão, café e petit fours."
            : "Reunião fora: veículo, motorista e endereço confirmado."}
        </p>
        <ul className="space-y-2">
          {draft.checklist.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-forest">
                <input
                  type="checkbox"
                  className="size-4 accent-forest"
                  checked={item.done}
                  onChange={(event) =>
                    patch({ checklist: markChecklist(draft.checklist, item.key, event.target.checked) })
                  }
                />
                <span className={item.done ? "text-forest/55 line-through" : ""}>{item.label}</span>
              </label>
              {item.custom ? (
                <button
                  type="button"
                  aria-label={`Remover ${item.label}`}
                  className="text-forest/35 hover:text-danger"
                  onClick={() =>
                    patch({ checklist: draft.checklist.filter((row) => row.key !== item.key) })
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            className={cn(fieldControlClass, "flex-1")}
            value={extraLabel}
            onChange={(event) => setExtraLabel(event.target.value)}
            placeholder="Incluir outro item…"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const label = extraLabel.trim();
              if (!label) return;
              patch({
                checklist: [...draft.checklist, { key: uid(), label, done: false, custom: true }],
              });
              setExtraLabel("");
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              const label = extraLabel.trim();
              if (!label) return;
              patch({
                checklist: [...draft.checklist, { key: uid(), label, done: false, custom: true }],
              });
              setExtraLabel("");
            }}
          >
            <Plus data-icon="inline-start" />
            Item
          </Button>
        </div>
      </div>

      <Field label="Observações">
        <textarea
          className={cn(fieldControlClass, "min-h-20 py-2")}
          value={draft.notes}
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {onDelete ? (
          <Button
            type="button"
            variant="outline"
            className="mr-auto h-10 text-danger hover:border-danger/30"
            onClick={onDelete}
          >
            Excluir
          </Button>
        ) : null}
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-10 px-5" onClick={submit}>
          {initial.title ? "Salvar reunião" : "Agendar reunião"}
        </Button>
      </div>
    </div>
  );
}
