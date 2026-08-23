"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { StatusBadge } from "@/components/events/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatLongDate, formatWeekday } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  MATERIAL_SOURCE_LABELS,
  SERVICE_STYLE_LABELS,
  STAFF_KIND_LABELS,
  VENUE_KIND_LABELS,
} from "@/lib/labels";
import { formatBRL } from "@/lib/money";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  guestTotal,
  MENU_SECTIONS,
  SERVICE_STYLES,
  type EventRecord,
  type MaterialSource,
  type MenuSectionKey,
  type StaffKind,
  type VenueKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  event: EventRecord;
  onSave: (event: EventRecord) => void;
  onDelete: (id: string) => void;
};

export function EventFicha({ event, onSave, onDelete }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(event);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const skip = useRef(true);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      onSave(draft);
      setSaveState("saved");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, onSave]);

  const pending = draft.finance.contractValue - draft.finance.paid;

  const update = <K extends keyof EventRecord>(key: K, value: EventRecord[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 text-sm font-light text-forest/60 hover:text-forest"
          >
            <ArrowLeft className="size-4" />
            Voltar ao calendário
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-section text-[0.68rem] text-terracotta">{draft.code}</p>
            <StatusBadge status={draft.status} />
            <span className="text-xs font-light text-forest/45">
              {saveState === "saving"
                ? "Salvando…"
                : saveState === "saved"
                  ? "Alterações salvas neste aparelho"
                  : "Ficha operacional"}
            </span>
          </div>
          <h1 className="font-display mt-2 text-4xl tracking-tight text-forest sm:text-5xl">
            {draft.title || "Evento sem nome"}
          </h1>
          <p className="mt-2 text-sm font-light text-forest/60">
            {formatWeekday(draft.date)}, {formatLongDate(draft.date)} · {draft.startTime} às{" "}
            {draft.endTime} · {guestTotal(draft.guests)} convidados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/eventos/${draft.id}/cozinha`}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
          >
            <Printer data-icon="inline-start" />
            Ver ficha da cozinha
          </Link>
          <Button
            className="h-10 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
            onClick={async () => {
              await downloadKitchenPdf(draft);
              toast.success("PDF da cozinha gerado.");
            }}
          >
            Gerar PDF
          </Button>
          <Button
            variant="outline"
            className="h-10 text-terracotta"
            onClick={() => {
              if (window.confirm("Excluir esta ficha? A ação não pode ser desfeita neste aparelho.")) {
                onDelete(draft.id);
                toast.success("Ficha excluída.");
                router.push("/eventos");
              }
            }}
          >
            <Trash2 data-icon="inline-start" />
            Excluir
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Identificação do evento"
          hint="Cabeçalho da ficha. Alimenta o calendário e os demais módulos."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Nome do evento" className="md:col-span-2">
            <input
              className={fieldControlClass}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </Field>
          <Field label="Código">
            <input
              className={fieldControlClass}
              value={draft.code}
              onChange={(event) => update("code", event.target.value)}
            />
          </Field>
          <Field label="Tipo">
            <select
              className={fieldControlClass}
              value={draft.type}
              onChange={(event) => update("type", event.target.value as EventRecord["type"])}
            >
              {EVENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {EVENT_TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={fieldControlClass}
              value={draft.status}
              onChange={(event) => update("status", event.target.value as EventRecord["status"])}
            >
              {EVENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {EVENT_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input
              type="date"
              className={fieldControlClass}
              value={draft.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>
          <Field label="Início">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.startTime}
              onChange={(event) => update("startTime", event.target.value)}
            />
          </Field>
          <Field label="Término">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.endTime}
              onChange={(event) => update("endTime", event.target.value)}
            />
          </Field>
          <Field label="Montagem">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.assemblyTime}
              onChange={(event) => update("assemblyTime", event.target.value)}
            />
          </Field>
          <Field label="Desmontagem">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.teardownTime}
              onChange={(event) => update("teardownTime", event.target.value)}
            />
          </Field>
          <Field label="Comercial">
            <input
              className={fieldControlClass}
              value={draft.commercialOwner}
              onChange={(event) => update("commercialOwner", event.target.value)}
            />
          </Field>
          <Field label="Operação">
            <input
              className={fieldControlClass}
              value={draft.operationalOwner}
              onChange={(event) => update("operationalOwner", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Cliente e contatos" hint="Quem contratou e quem responde no dia." />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cliente">
            <input
              className={fieldControlClass}
              value={draft.client.name}
              onChange={(event) =>
                update("client", { ...draft.client, name: event.target.value })
              }
            />
          </Field>
          <Field label="Empresa">
            <input
              className={fieldControlClass}
              value={draft.client.company}
              onChange={(event) =>
                update("client", { ...draft.client, company: event.target.value })
              }
            />
          </Field>
          <Field label="Telefone">
            <input
              className={fieldControlClass}
              value={draft.client.phone}
              onChange={(event) =>
                update("client", { ...draft.client, phone: event.target.value })
              }
            />
          </Field>
          <Field label="E-mail">
            <input
              className={fieldControlClass}
              value={draft.client.email}
              onChange={(event) =>
                update("client", { ...draft.client, email: event.target.value })
              }
            />
          </Field>
          <Field label="Contato no dia">
            <input
              className={fieldControlClass}
              value={draft.client.dayContactName}
              onChange={(event) =>
                update("client", { ...draft.client, dayContactName: event.target.value })
              }
            />
          </Field>
          <Field label="Telefone do dia">
            <input
              className={fieldControlClass}
              value={draft.client.dayContactPhone}
              onChange={(event) =>
                update("client", { ...draft.client, dayContactPhone: event.target.value })
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Local e público" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Tipo de local">
            <select
              className={fieldControlClass}
              value={draft.venue.kind}
              onChange={(event) => {
                const kind = event.target.value as VenueKind;
                update("venue", {
                  ...draft.venue,
                  kind,
                  name: kind === "casa_braga" ? "Casa Braga" : draft.venue.name,
                });
              }}
            >
              {Object.entries(VENUE_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome do espaço">
            <input
              className={fieldControlClass}
              value={draft.venue.name}
              onChange={(event) =>
                update("venue", { ...draft.venue, name: event.target.value })
              }
            />
          </Field>
          <Field label="Adultos">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.guests.adults}
              onChange={(event) =>
                update("guests", { ...draft.guests, adults: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Crianças">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.guests.children}
              onChange={(event) =>
                update("guests", {
                  ...draft.guests,
                  children: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Endereço" className="md:col-span-2 xl:col-span-3">
            <input
              className={fieldControlClass}
              value={draft.venue.address}
              onChange={(event) =>
                update("venue", { ...draft.venue, address: event.target.value })
              }
            />
          </Field>
          <Field label="Total pax">
            <div className={cn(fieldControlClass, "flex items-center bg-cream font-medium")}>
              {guestTotal(draft.guests)}
            </div>
          </Field>
          <Field label="Acesso e observações do local" className="md:col-span-2 xl:col-span-4">
            <textarea
              className={cn(fieldControlClass, "h-20 py-2")}
              value={draft.venue.notes}
              onChange={(event) =>
                update("venue", { ...draft.venue, notes: event.target.value })
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Serviço" hint="Como a casa atende no salão." />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Modalidade">
            <select
              className={fieldControlClass}
              value={draft.serviceStyle}
              onChange={(event) =>
                update("serviceStyle", event.target.value as EventRecord["serviceStyle"])
              }
            >
              {SERVICE_STYLES.map((item) => (
                <option key={item} value={item}>
                  {SERVICE_STYLE_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Uniforme">
            <input
              className={fieldControlClass}
              value={draft.uniform}
              onChange={(event) => update("uniform", event.target.value)}
            />
          </Field>
          <Field label="Observações de serviço" className="md:col-span-2">
            <textarea
              className={cn(fieldControlClass, "h-20 py-2")}
              value={draft.serviceNotes}
              onChange={(event) => update("serviceNotes", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Cronograma" hint="Ordem do dia para operação e cozinha." />
        <RowTable
          columns={["Horário", "Atividade", "Responsável"]}
          onAdd={() =>
            update("timeline", [
              ...draft.timeline,
              { id: uid(), time: "", activity: "", owner: "" },
            ])
          }
        >
          {draft.timeline.map((item, index) => (
            <tr key={item.id} className="border-t border-forest/8">
              <td className="p-2">
                <input
                  type="time"
                  className={fieldControlClass}
                  value={item.time}
                  onChange={(event) => {
                    const timeline = [...draft.timeline];
                    timeline[index] = { ...item, time: event.target.value };
                    update("timeline", timeline);
                  }}
                />
              </td>
              <td className="p-2">
                <input
                  className={fieldControlClass}
                  value={item.activity}
                  onChange={(event) => {
                    const timeline = [...draft.timeline];
                    timeline[index] = { ...item, activity: event.target.value };
                    update("timeline", timeline);
                  }}
                />
              </td>
              <td className="p-2">
                <input
                  className={fieldControlClass}
                  value={item.owner}
                  onChange={(event) => {
                    const timeline = [...draft.timeline];
                    timeline[index] = { ...item, owner: event.target.value };
                    update("timeline", timeline);
                  }}
                />
              </td>
              <td className="p-2 text-right">
                <RemoveButton
                  onClick={() =>
                    update(
                      "timeline",
                      draft.timeline.filter((row) => row.id !== item.id),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </RowTable>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Cardápio"
          hint="Base da Separação de Insumos e das Fichas Técnicas."
        />
        <div className="space-y-8">
          {MENU_SECTIONS.map((section) => (
            <MenuBlock
              key={section.key}
              title={section.label}
              items={draft.menu[section.key]}
              onChange={(items) =>
                update("menu", { ...draft.menu, [section.key]: items })
              }
            />
          ))}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Restrições e alergias">
              <textarea
                className={cn(
                  fieldControlClass,
                  "min-h-28 border-terracotta/30 bg-terracotta/5 py-2",
                )}
                value={draft.menu.dietaryNotes}
                onChange={(event) =>
                  update("menu", { ...draft.menu, dietaryNotes: event.target.value })
                }
              />
            </Field>
            <Field label="Observações da cozinha">
              <textarea
                className={cn(fieldControlClass, "min-h-28 py-2")}
                value={draft.menu.kitchenNotes}
                onChange={(event) =>
                  update("menu", { ...draft.menu, kitchenNotes: event.target.value })
                }
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Equipe"
          hint="Alimenta Administrativo e o pagamento de mão de obra externa."
        />
        <RowTable
          columns={["Função", "Nome", "Qtd", "Tipo", "Turno", "Diária"]}
          onAdd={() =>
            update("staff", [
              ...draft.staff,
              {
                id: uid(),
                role: "",
                name: "",
                quantity: 1,
                kind: "interna",
                shift: "",
                dailyRate: 0,
              },
            ])
          }
        >
          {draft.staff.map((item, index) => (
            <tr key={item.id} className="border-t border-forest/8">
              <CellInput
                value={item.role}
                onChange={(value) => {
                  const staff = [...draft.staff];
                  staff[index] = { ...item, role: value };
                  update("staff", staff);
                }}
              />
              <CellInput
                value={item.name}
                onChange={(value) => {
                  const staff = [...draft.staff];
                  staff[index] = { ...item, name: value };
                  update("staff", staff);
                }}
              />
              <CellInput
                type="number"
                value={String(item.quantity)}
                onChange={(value) => {
                  const staff = [...draft.staff];
                  staff[index] = { ...item, quantity: Number(value) };
                  update("staff", staff);
                }}
              />
              <td className="p-2">
                <select
                  className={fieldControlClass}
                  value={item.kind}
                  onChange={(event) => {
                    const staff = [...draft.staff];
                    staff[index] = { ...item, kind: event.target.value as StaffKind };
                    update("staff", staff);
                  }}
                >
                  {Object.entries(STAFF_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <CellInput
                value={item.shift}
                onChange={(value) => {
                  const staff = [...draft.staff];
                  staff[index] = { ...item, shift: value };
                  update("staff", staff);
                }}
              />
              <CellInput
                type="number"
                value={String(item.dailyRate)}
                onChange={(value) => {
                  const staff = [...draft.staff];
                  staff[index] = { ...item, dailyRate: Number(value) };
                  update("staff", staff);
                }}
              />
              <td className="p-2 text-right">
                <RemoveButton
                  onClick={() =>
                    update(
                      "staff",
                      draft.staff.filter((row) => row.id !== item.id),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </RowTable>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Materiais e estrutura"
          hint="Base da Separação, Estoque e Alocação de Materiais."
        />
        <RowTable
          columns={["Item", "Qtd", "Unidade", "Origem", "Obs."]}
          onAdd={() =>
            update("materials", [
              ...draft.materials,
              {
                id: uid(),
                name: "",
                quantity: 1,
                unit: "un",
                source: "estoque",
                notes: "",
              },
            ])
          }
        >
          {draft.materials.map((item, index) => (
            <tr key={item.id} className="border-t border-forest/8">
              <CellInput
                value={item.name}
                onChange={(value) => {
                  const materials = [...draft.materials];
                  materials[index] = { ...item, name: value };
                  update("materials", materials);
                }}
              />
              <CellInput
                type="number"
                value={String(item.quantity)}
                onChange={(value) => {
                  const materials = [...draft.materials];
                  materials[index] = { ...item, quantity: Number(value) };
                  update("materials", materials);
                }}
              />
              <CellInput
                value={item.unit}
                onChange={(value) => {
                  const materials = [...draft.materials];
                  materials[index] = { ...item, unit: value };
                  update("materials", materials);
                }}
              />
              <td className="p-2">
                <select
                  className={fieldControlClass}
                  value={item.source}
                  onChange={(event) => {
                    const materials = [...draft.materials];
                    materials[index] = {
                      ...item,
                      source: event.target.value as MaterialSource,
                    };
                    update("materials", materials);
                  }}
                >
                  {Object.entries(MATERIAL_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <CellInput
                value={item.notes}
                onChange={(value) => {
                  const materials = [...draft.materials];
                  materials[index] = { ...item, notes: value };
                  update("materials", materials);
                }}
              />
              <td className="p-2 text-right">
                <RemoveButton
                  onClick={() =>
                    update(
                      "materials",
                      draft.materials.filter((row) => row.id !== item.id),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </RowTable>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Veículos" hint="Base do Controle de Uso dos Veículos." />
        <RowTable
          columns={["Veículo", "Motorista", "Saída", "Retorno", "Finalidade"]}
          onAdd={() =>
            update("vehicles", [
              ...draft.vehicles,
              {
                id: uid(),
                vehicle: "",
                driver: "",
                departure: "",
                returnTime: "",
                purpose: "",
              },
            ])
          }
        >
          {draft.vehicles.map((item, index) => (
            <tr key={item.id} className="border-t border-forest/8">
              <CellInput
                value={item.vehicle}
                onChange={(value) => {
                  const vehicles = [...draft.vehicles];
                  vehicles[index] = { ...item, vehicle: value };
                  update("vehicles", vehicles);
                }}
              />
              <CellInput
                value={item.driver}
                onChange={(value) => {
                  const vehicles = [...draft.vehicles];
                  vehicles[index] = { ...item, driver: value };
                  update("vehicles", vehicles);
                }}
              />
              <CellInput
                type="time"
                value={item.departure}
                onChange={(value) => {
                  const vehicles = [...draft.vehicles];
                  vehicles[index] = { ...item, departure: value };
                  update("vehicles", vehicles);
                }}
              />
              <CellInput
                type="time"
                value={item.returnTime}
                onChange={(value) => {
                  const vehicles = [...draft.vehicles];
                  vehicles[index] = { ...item, returnTime: value };
                  update("vehicles", vehicles);
                }}
              />
              <CellInput
                value={item.purpose}
                onChange={(value) => {
                  const vehicles = [...draft.vehicles];
                  vehicles[index] = { ...item, purpose: value };
                  update("vehicles", vehicles);
                }}
              />
              <td className="p-2 text-right">
                <RemoveButton
                  onClick={() =>
                    update(
                      "vehicles",
                      draft.vehicles.filter((row) => row.id !== item.id),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </RowTable>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Financeiro resumido"
          hint="Depois vira Contas a Receber. A cozinha não vê estes valores no PDF."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Valor do contrato">
            <input
              type="number"
              className={fieldControlClass}
              value={draft.finance.contractValue}
              onChange={(event) =>
                update("finance", {
                  ...draft.finance,
                  contractValue: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Já recebido">
            <input
              type="number"
              className={fieldControlClass}
              value={draft.finance.paid}
              onChange={(event) =>
                update("finance", {
                  ...draft.finance,
                  paid: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Saldo">
            <div className={cn(fieldControlClass, "flex items-center bg-cream font-medium")}>
              {formatBRL(pending)}
            </div>
          </Field>
          <Field label="Observações de pagamento" className="md:col-span-3">
            <textarea
              className={cn(fieldControlClass, "h-20 py-2")}
              value={draft.finance.paymentNotes}
              onChange={(event) =>
                update("finance", {
                  ...draft.finance,
                  paymentNotes: event.target.value,
                })
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Briefing e pontos de atenção" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Briefing">
            <textarea
              className={cn(fieldControlClass, "min-h-32 py-2")}
              value={draft.briefing}
              onChange={(event) => update("briefing", event.target.value)}
            />
          </Field>
          <Field label="Pontos de atenção">
            <textarea
              className={cn(fieldControlClass, "min-h-32 border-terracotta/25 py-2")}
              value={draft.attentionPoints}
              onChange={(event) => update("attentionPoints", event.target.value)}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

function RowTable({
  columns,
  onAdd,
  children,
}: {
  columns: string[];
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="field-label px-2 pb-2 font-normal">
                  {column}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody className="font-list">{children}</tbody>
        </table>
      </div>
      <Button variant="outline" className="mt-3" onClick={onAdd}>
        <Plus data-icon="inline-start" />
        Adicionar linha
      </Button>
    </div>
  );
}

function CellInput({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <td className="p-2">
      <input
        type={type}
        className={fieldControlClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-forest/35 transition-colors hover:text-terracotta"
      aria-label="Remover"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function MenuBlock({
  title,
  items,
  onChange,
}: {
  title: string;
  items: EventRecord["menu"][MenuSectionKey];
  onChange: (items: EventRecord["menu"][MenuSectionKey]) => void;
}) {
  return (
    <div>
      <h3 className="font-section mb-3 text-[0.7rem] text-forest/55">{title}</h3>
      <RowTable
        columns={["Preparação", "Quantidade", "Obs."]}
        onAdd={() =>
          onChange([...items, { id: uid(), name: "", quantity: "", notes: "" }])
        }
      >
        {items.map((item, index) => (
          <tr key={item.id} className="border-t border-forest/8">
            <CellInput
              value={item.name}
              onChange={(value) => {
                const next = [...items];
                next[index] = { ...item, name: value };
                onChange(next);
              }}
            />
            <CellInput
              value={item.quantity}
              onChange={(value) => {
                const next = [...items];
                next[index] = { ...item, quantity: value };
                onChange(next);
              }}
            />
            <CellInput
              value={item.notes}
              onChange={(value) => {
                const next = [...items];
                next[index] = { ...item, notes: value };
                onChange(next);
              }}
            />
            <td className="p-2 text-right">
              <RemoveButton
                onClick={() => onChange(items.filter((row) => row.id !== item.id))}
              />
            </td>
          </tr>
        ))}
      </RowTable>
    </div>
  );
}
