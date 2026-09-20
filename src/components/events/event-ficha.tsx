"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ClipboardList, FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClienteForm } from "@/components/cadastros/cliente-form";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { Modal, SearchInput } from "@/components/cadastros/ui";
import { EventDrinksFields, EventUniformsFields } from "@/components/events/drinks-uniforms";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { fieldControlClass, Field, SectionTitle } from "@/components/events/field";
import { StatusBadge } from "@/components/events/status-badge";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { downloadVehicleChecklistPdf } from "@/components/veiculos/checklist-pdf";
import { useVeiculosUso } from "@/components/veiculos/veiculos-uso-provider";
import type { DishRecord } from "@/lib/cadastros/types";
import { VEHICLE_USAGE_CATEGORY_LABELS } from "@/lib/cadastros/types";
import { formatBRL } from "@/lib/crm/format";
import { formatDateTime, formatLongDate, formatWeekday } from "@/lib/dates";
import { insertDishesIntoMenu } from "@/lib/event-factory";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, VENUE_KIND_LABELS } from "@/lib/labels";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  PICKABLE_EXTRA_STAFF_ROLES,
  extraStaffLabel,
  guestTotal,
  MENU_SECTIONS,
  normalizeEventRecord,
  normalizeGuests,
  STAFF_ROLES,
  suggestedDrinkQuantities,
  DEFAULT_DRINK_PREMISES,
  type ExtraStaffRoleKey,
  type EventLaborAllocation,
  type EventRecord,
  type EventSaveMeta,
  type Guests,
  type MenuSectionKey,
  type VenueKind,
  type YesNo,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { laborLineAmounts, rateFor } from "@/lib/mao-de-obra/calc";
import { LABOR_FUNCTIONS, workerFunctionKeys, workerFunctionsLabel, type ExternalWorker, type LaborRate } from "@/lib/mao-de-obra/types";

type Props = {
  event: EventRecord;
  onSave: (event: EventRecord, meta?: EventSaveMeta) => EventRecord | void;
  onDelete: (id: string) => void;
};

function snapshotForDirty(event: EventRecord) {
  const { changeLog: _changeLog, updatedAt: _updatedAt, ...rest } = normalizeEventRecord(event);
  return JSON.stringify(rest);
}

export function EventFicha({ event, onSave, onDelete }: Props) {
  const router = useRouter();
  const { data: cadastros, upsertCliente } = useCadastros();
  const { data: maoDeObra, reload: reloadLabor } = useMaoDeObra();
  const { markGenerated } = useVeiculosUso();
  const [draft, setDraft] = useState(() => normalizeEventRecord(event));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "working">("idle");
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [clientModal, setClientModal] = useState(false);
  const [reasonModal, setReasonModal] = useState(false);
  const [reason, setReason] = useState("");
  const [changeAtLabel, setChangeAtLabel] = useState("");
  const [baseline, setBaseline] = useState(() => snapshotForDirty(event));
  const drinkPremises = cadastros?.drinkPremises ?? DEFAULT_DRINK_PREMISES;
  const clientes = [...(cadastros?.clientes ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  const clientName = clientes.find((cliente) => cliente.id === draft.clientId)?.name;
  const clientMissing = Boolean(draft.clientId) && !clientName;
  const clientLabel = clientName || (clientMissing ? "Cliente não encontrado" : "Sem cliente");
  const dirty = useMemo(() => snapshotForDirty(draft) !== baseline, [baseline, draft]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (browserEvent: BeforeUnloadEvent) => {
      browserEvent.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const update = <K extends keyof EventRecord>(key: K, value: EventRecord[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setGuests = (guests: Guests) => {
    const next = normalizeGuests(guests);
    setDraft((current) => ({
      ...current,
      guests: next,
      drinks:
        current.drinksAuto === false
          ? current.drinks
          : suggestedDrinkQuantities(guestTotal(next), drinkPremises),
    }));
  };

  const generatePerCapita = () => {
    const selected = new Set(draft.selectedDishIds ?? []);
    const dishes = (cadastros?.dishes ?? []).filter((dish) => selected.has(dish.id));
    if (dishes.length === 0) {
      toast.error("Selecione ao menos um prato do catálogo.");
      return;
    }
    update("menu", insertDishesIntoMenu(draft.menu, dishes));
    setCatalogOpen(false);
    toast.success(
      `${dishes.length} prato${dishes.length === 1 ? "" : "s"} no cardápio do evento. Preencha o per capita e as observações.`,
    );
  };

  const openSaveModal = () => {
    if (!dirty) {
      toast.message("Nenhuma alteração para salvar.");
      return;
    }
    setReason("");
    setChangeAtLabel(formatDateTime(new Date().toISOString()));
    setReasonModal(true);
  };

  const confirmSave = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Informe o motivo da alteração.");
      return;
    }
    setSaveState("saving");
    const saved = onSave(draft, { reason: trimmed, clientLabel });
    const next = normalizeEventRecord(saved || draft);
    setDraft(next);
    setBaseline(snapshotForDirty(next));
    setReasonModal(false);
    setReason("");
    setSaveState("saved");
    toast.success("Alterações salvas.");
    window.setTimeout(() => {
      void reloadLabor();
    }, 600);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
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
            <p className="text-[13px] font-medium text-forest/50">{draft.code}</p>
            <StatusBadge status={draft.status} />
            <span className="text-xs font-light text-forest/45">
              {saveState === "saving"
                ? "Salvando…"
                : dirty
                  ? "Alterações não salvas"
                  : saveState === "saved"
                    ? "Alterações salvas"
                    : "Ficha operacional — uso interno"}
            </span>
          </div>
          <h1 className="page-title mt-2">
            {draft.title || "Evento sem nome"}
          </h1>
          <p className="mt-2 text-sm font-light text-forest/60">
            {draft.date ? `${formatWeekday(draft.date)}, ${formatLongDate(draft.date)}` : "Data a definir"}
            {clientName ? ` · ${clientName}` : ""}
            {draft.ceremonyTime ? ` · cerimônia ${draft.ceremonyTime}` : ""}
            {draft.invitationTime ? ` · convite ${draft.invitationTime}` : ""}
            {draft.serviceTime ? ` · serviço ${draft.serviceTime}` : ""}
            {` · ${guestTotal(draft.guests)} a servir`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-10 bg-forest px-4 text-cream hover:bg-petrol"
            disabled={!dirty || saveState === "saving"}
            onClick={openSaveModal}
          >
            Salvar alterações
          </Button>
          <Button
            className="h-10 bg-terracotta px-4 text-cream hover:bg-terracotta/90"
            disabled={pdfState === "working"}
            onClick={async () => {
              if (!draft.ceremonyTime) {
                toast.error("Informe o horário da cerimônia antes de gerar o PDF.");
                return;
              }
              try {
                setPdfState("working");
                await downloadKitchenPdf(draft);
                toast.success("PDF da cozinha baixado.");
              } catch (error) {
                console.error(error);
                toast.error("Não foi possível gerar o PDF.");
              } finally {
                setPdfState("idle");
              }
            }}
          >
            {pdfState === "working" ? "Gerando…" : "Gerar PDF"}
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
          title="Dados do evento"
          hint="O material fica alocado da entrega até o recolhimento (inclusive). Campos com estrela são obrigatórios."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="★ Nome do evento" className="md:col-span-2">
            <input
              className={fieldControlClass}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </Field>
          <Field label="★ Tipo do evento">
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
          <Field label="Cliente">
            <div className="flex gap-2">
              <select
                className={cn(fieldControlClass, "min-w-0 flex-1")}
                value={draft.clientId ?? ""}
                onChange={(event) => update("clientId", event.target.value)}
              >
                <option value="">Sem cliente vinculado</option>
                {clientMissing ? (
                  <option value={draft.clientId}>Cliente removido da base</option>
                ) : null}
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 px-3"
                onClick={() => setClientModal(true)}
                aria-label="Cadastrar cliente"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </Field>
          <Field label="Status interno">
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
          <Field label="★ Data do evento">
            <input
              type="date"
              className={fieldControlClass}
              value={draft.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>
          <Field label="Dt. entrega material">
            <input
              type="date"
              className={fieldControlClass}
              value={draft.materialDeliveryDate}
              onChange={(event) => update("materialDeliveryDate", event.target.value)}
            />
          </Field>
          <Field label="Dt. recolhimento material">
            <input
              type="date"
              className={fieldControlClass}
              value={draft.materialPickupDate ?? ""}
              onChange={(event) => update("materialPickupDate", event.target.value)}
            />
          </Field>
          <Field label="Dt. entrega comida">
            <input
              type="date"
              className={fieldControlClass}
              value={draft.foodDeliveryDate}
              onChange={(event) => update("foodDeliveryDate", event.target.value)}
            />
          </Field>
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
          <Field label="Local / endereço" className="md:col-span-2 xl:col-span-3">
            <input
              className={fieldControlClass}
              value={draft.venue.address}
              onChange={(event) =>
                update("venue", { ...draft.venue, address: event.target.value })
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Convidados e horários"
          hint="Profissionais são externos que se alimentam no evento (fotógrafo, DJ, cerimonialista)."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="★ Adultos">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.guests.adults}
              onChange={(event) =>
                setGuests({ ...draft.guests, adults: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Crianças 0 a 5 anos">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.guests.children0to5 ?? 0}
              onChange={(event) =>
                setGuests({ ...draft.guests, children0to5: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Crianças 5 a 10 anos">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.guests.children5to10 ?? 0}
              onChange={(event) =>
                setGuests({ ...draft.guests, children5to10: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Profissionais">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.guests.professionals}
              onChange={(event) =>
                setGuests({
                  ...draft.guests,
                  professionals: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="★ Ilhas (estações)">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.islands ?? 0}
              onChange={(event) => update("islands", Number(event.target.value))}
            />
          </Field>
          <Field label="Chegada equipe">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.teamArrival}
              onChange={(event) => update("teamArrival", event.target.value)}
            />
          </Field>
          <Field label="★ Horário da cerimônia">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.ceremonyTime ?? ""}
              onChange={(event) => update("ceremonyTime", event.target.value)}
            />
          </Field>
          <Field label="Horário convite">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.invitationTime}
              onChange={(event) => update("invitationTime", event.target.value)}
            />
          </Field>
          <Field label="Horário serviço">
            <input
              type="time"
              className={fieldControlClass}
              value={draft.serviceTime}
              onChange={(event) => update("serviceTime", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Equipe"
          hint="Quantidade por função. Use + para acrescentar outras funções opcionais."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAFF_ROLES.map((role) => (
            <Field key={role.key} label={role.label}>
              <input
                type="number"
                min={0}
                className={fieldControlClass}
                value={draft.staff[role.key]}
                onChange={(event) =>
                  update("staff", {
                    ...draft.staff,
                    [role.key]: Number(event.target.value),
                  } as EventRecord["staff"])
                }
              />
            </Field>
          ))}
        </div>
        {draft.extraStaff?.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {draft.extraStaff.map((line) => (
              <Field key={line.key} label={extraStaffLabel(line.key)}>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    className={cn(fieldControlClass, "min-w-0 flex-1")}
                    value={line.quantity}
                    onChange={(event) =>
                      update(
                        "extraStaff",
                        (draft.extraStaff ?? []).map((item) =>
                          item.key === line.key
                            ? { ...item, quantity: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Remover ${extraStaffLabel(line.key)}`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-forest/35 hover:text-terracotta"
                    onClick={() =>
                      update(
                        "extraStaff",
                        (draft.extraStaff ?? []).filter((item) => item.key !== line.key),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Field>
            ))}
          </div>
        ) : null}
        {PICKABLE_EXTRA_STAFF_ROLES.some(
          (role) => !(draft.extraStaff ?? []).some((line) => line.key === role.key),
        ) ? (
          <div className="mt-4">
            <ExtraStaffPicker
              used={new Set((draft.extraStaff ?? []).map((line) => line.key))}
              onAdd={(key) =>
                update("extraStaff", [...(draft.extraStaff ?? []), { key, quantity: 1 }])
              }
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Veículos"
          hint="Selecione a frota deste evento. Marque fora da cidade para disparar a ajuda de custo da equipe externa."
        />
        <YesNoField
          label="Evento fora da cidade?"
          value={draft.outOfTown ? "sim" : "nao"}
          onChange={(value) => update("outOfTown", value === "sim")}
        />
        {(cadastros?.veiculos ?? []).length === 0 ? (
          <p className="mt-4 text-sm font-light text-forest/50">
            Cadastre a frota em Cadastros → Veículos para alocar aqui.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {(cadastros?.veiculos ?? [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((vehicle) => {
                const selected = (draft.vehicleIds ?? []).includes(vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    className="flex flex-col gap-2 rounded-xl border border-forest/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected}
                        onChange={() => {
                          const current = draft.vehicleIds ?? [];
                          update(
                            "vehicleIds",
                            selected ? current.filter((id) => id !== vehicle.id) : [...current, vehicle.id],
                          );
                        }}
                      />
                      <span>
                        <span className="block text-sm font-medium text-forest">{vehicle.name}</span>
                        <span className="block text-xs font-light text-forest/45">
                          {[vehicle.plate, vehicle.model, VEHICLE_USAGE_CATEGORY_LABELS[vehicle.usageCategory]]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </label>
                    {selected ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 shrink-0 px-3"
                        onClick={async () => {
                          try {
                            await downloadVehicleChecklistPdf(draft, vehicle);
                            markGenerated(draft.id, vehicle.id);
                            toast.success("Checklist baixado para preenchimento e assinatura.");
                          } catch (error) {
                            console.error(error);
                            toast.error("Não foi possível gerar o PDF.");
                          }
                        }}
                      >
                        <FileDown data-icon="inline-start" />
                        Checklist PDF
                      </Button>
                    ) : null}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Equipe externa"
          hint="Puxe da base cadastrada. Ao salvar, o financeiro recebe o lançamento automaticamente."
        />
        {(maoDeObra?.workers ?? []).length === 0 ? (
          <p className="text-sm font-light text-forest/50">
            Cadastre os prestadores em Administrativo → Mão de obra externa (com as funções que a pessoa pode exercer). Na ficha, escolha a função deste evento.
          </p>
        ) : (
          <EventLaborAllocations
            allocations={draft.laborAllocations ?? []}
            outOfTown={Boolean(draft.outOfTown)}
            workers={maoDeObra?.workers ?? []}
            rates={maoDeObra?.rates ?? []}
            onChange={(next) => update("laborAllocations", next)}
          />
        )}
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <button
          type="button"
          aria-expanded={catalogOpen}
          onClick={() => setCatalogOpen((open) => !open)}
          className="mb-5 flex w-full items-start justify-between gap-3 border-b border-forest/10 pb-3 text-left"
        >
          <div>
            <p className="text-[13px] font-medium text-forest/50">Cadastros</p>
            <h2 className="mt-1 text-[15px] font-semibold text-forest">
              Pratos do cardápio (catálogo)
            </h2>
            <p className="mt-1 text-xs font-light text-forest/50">
              Selecione os pratos e clique em Gerar Per Capita. Clique para{" "}
              {catalogOpen ? "recolher" : "expandir"} o catálogo.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 size-4 shrink-0 text-forest/40 transition-transform",
              catalogOpen && "rotate-180",
            )}
          />
        </button>
        {catalogOpen ? (
          <CatalogDishPicker
            dishes={cadastros?.dishes ?? []}
            categoryOrder={cadastros?.dishCategories ?? []}
            selected={draft.selectedDishIds ?? []}
            onChange={(ids) => update("selectedDishIds", ids)}
          />
        ) : (
          <p className="text-sm font-light text-forest/50">
            {(draft.selectedDishIds ?? []).length} prato(s) selecionado(s) no catálogo.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button className="h-9 bg-forest px-4 text-cream hover:bg-petrol" onClick={generatePerCapita}>
            Gerar Per Capita
          </Button>
          <Link
            href={`/logistica/separacao-materiais/${draft.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
          >
            <ClipboardList data-icon="inline-start" />
            Abrir separação de materiais
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Cardápio do evento"
          hint="Só entram pratos gerados a partir do catálogo. Preencha o per capita e as observações."
        />
        {MENU_SECTIONS.every((section) => !draft.menu[section.key]?.some((item) => item.name.trim())) ? (
          <p className="rounded-xl border border-dashed border-forest/20 p-4 text-sm font-light text-forest/50">
            Nenhum prato neste cardápio. Selecione no catálogo e clique em Gerar Per Capita.
          </p>
        ) : (
          <div className="space-y-7">
            {MENU_SECTIONS.map((section) => {
              const items = draft.menu[section.key].filter((item) => item.name.trim());
              if (items.length === 0) return null;
              return (
                <MenuBlock
                  key={section.key}
                  title={section.label}
                  items={items}
                  onChange={(nextItems) =>
                    update("menu", { ...draft.menu, [section.key]: nextItems })
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <EventDrinksFields
        drinks={draft.drinks}
        notes={draft.drinksNotes}
        premises={drinkPremises}
        onNotesChange={(value) => update("drinksNotes", value)}
        onChange={(key, value) =>
          setDraft((current) => ({
            ...current,
            drinksAuto: false,
            drinks: { ...current.drinks, [key]: value },
          }))
        }
        onRecalculate={() =>
          setDraft((current) => ({
            ...current,
            drinksAuto: true,
            drinks: suggestedDrinkQuantities(guestTotal(current.guests), drinkPremises),
          }))
        }
      />

      <EventUniformsFields
        uniforms={draft.uniforms}
        onChange={(piece, size, value) =>
          update("uniforms", {
            ...draft.uniforms,
            [piece]: { ...draft.uniforms[piece], [size]: value },
          })
        }
      />

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Extras e logística" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Álcool? Quais?" className="md:col-span-2 xl:col-span-3">
            <input
              className={fieldControlClass}
              value={draft.logistics.alcohol}
              onChange={(event) =>
                update("logistics", { ...draft.logistics, alcohol: event.target.value })
              }
            />
          </Field>
          <YesNoField
            label="Material dia anterior?"
            value={draft.logistics.materialPreviousDay}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, materialPreviousDay: value })
            }
          />
          <YesNoField
            label="Mesa cavalete?"
            value={draft.logistics.trestleTable}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, trestleTable: value })
            }
          />
          <YesNoField
            label="Local c/ cozinha?"
            value={draft.logistics.hasKitchen}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, hasKitchen: value })
            }
          />
          <YesNoField
            label="Local c/ freezer?"
            value={draft.logistics.hasFreezer}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, hasFreezer: value })
            }
          />
          <YesNoField
            label="Local c/ forno?"
            value={draft.logistics.hasOven}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, hasOven: value })
            }
          />
          <YesNoField
            label="Local c/ microondas?"
            value={draft.logistics.hasMicrowave}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, hasMicrowave: value })
            }
          />
        </div>
        <Field label="Observações — logística" className="mt-4">
          <textarea
            className={cn(fieldControlClass, "min-h-24 py-2")}
            value={draft.logisticsNotes ?? ""}
            onChange={(event) => update("logisticsNotes", event.target.value)}
            placeholder="Notas da equipe de logística para este evento."
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Observações — cozinha"
          hint="Restrições alimentares, cardápio e montagem."
        />
        <Field label="Restrições alimentares" className="mb-4">
          <textarea
            className={cn(
              fieldControlClass,
              "min-h-24 border-terracotta/30 bg-terracotta/5 py-2",
            )}
            value={draft.dietaryNotes}
            onChange={(event) => update("dietaryNotes", event.target.value)}
          />
        </Field>
        <Field label="Cardápio e montagem">
          <textarea
            className={cn(fieldControlClass, "min-h-36 py-3")}
            value={draft.menuSetupNotes}
            onChange={(event) => update("menuSetupNotes", event.target.value)}
          />
        </Field>
      </section>

      <EventChangeHistory
        entries={draft.changeLog ?? []}
        clientNameById={new Map(clientes.map((cliente) => [cliente.id, cliente.name]))}
      />

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="Novo cliente" wide>
        <ClienteForm
          initial={null}
          onCancel={() => setClientModal(false)}
          onSubmit={(cliente) => {
            upsertCliente(cliente);
            update("clientId", cliente.id);
            setClientModal(false);
            toast.success("Cliente cadastrado e vinculado à ficha.");
          }}
        />
      </Modal>

      <Modal open={reasonModal} onClose={() => setReasonModal(false)} title="Motivo da alteração">
        <div className="space-y-4">
          <p className="text-sm font-light text-forest/65">
            Informe por que esta ficha está sendo alterada. O registro fica no histórico.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-forest/10 bg-white px-3 py-2">
              <p className="field-label">Cliente</p>
              <p className="mt-1 text-sm text-forest">{clientLabel}</p>
            </div>
            <div className="rounded-xl border border-forest/10 bg-white px-3 py-2">
              <p className="field-label">Data da alteração</p>
              <p className="mt-1 text-sm text-forest">{changeAtLabel}</p>
            </div>
          </div>
          <Field label="Motivo">
            <textarea
              className={cn(fieldControlClass, "min-h-28 py-3")}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: ajuste de equipe a pedido do cliente"
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={() => setReasonModal(false)}>
              Cancelar
            </Button>
            <Button type="button" className="h-10 bg-forest text-cream hover:bg-petrol" onClick={confirmSave}>
              Confirmar e salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EventLaborAllocations({
  allocations,
  outOfTown,
  workers,
  rates,
  onChange,
}: {
  allocations: EventLaborAllocation[];
  outOfTown: boolean;
  workers: ExternalWorker[];
  rates: LaborRate[];
  onChange: (next: EventLaborAllocation[]) => void;
}) {
  const used = new Set(allocations.map((item) => item.workerId));
  const available = workers.filter((worker) => !used.has(worker.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));

  return (
    <div className="space-y-3">
      {allocations.map((row) => {
        const worker = workerById.get(row.workerId);
        const allowed = worker ? workerFunctionKeys(worker) : [];
        const functionOptions = allowed.length
          ? LABOR_FUNCTIONS.filter((role) => allowed.includes(role.key))
          : LABOR_FUNCTIONS;
        const functionKey = row.functionKey || allowed[0] || "";
        const amounts = laborLineAmounts(row, rateFor(rates, functionKey), outOfTown);
        return (
          <div key={row.workerId} className="rounded-xl border border-forest/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-forest">{worker?.name || "Prestador removido"}</p>
                <p className="text-xs font-light text-forest/45">
                  {formatBRL(amounts.total)}
                  {amounts.allowance ? " · ajuda de custo" : outOfTown ? "" : " · ajuda só fora da cidade"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remover prestador"
                className="flex size-8 items-center justify-center text-forest/35 hover:text-terracotta"
                onClick={() => onChange(allocations.filter((item) => item.workerId !== row.workerId))}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field label="Função neste evento" className="sm:col-span-2">
                <select
                  className={fieldControlClass}
                  value={functionKey}
                  onChange={(event) =>
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId ? { ...item, functionKey: event.target.value } : item,
                      ),
                    )
                  }
                >
                  {functionOptions.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hora extra">
                <select
                  className={fieldControlClass}
                  value={row.overtime ? "sim" : "nao"}
                  onChange={(event) =>
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId
                          ? { ...item, overtime: event.target.value === "sim" }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </Field>
              <Field label="Horas">
                <input
                  type="number"
                  min={0}
                  className={fieldControlClass}
                  disabled={!row.overtime}
                  value={row.overtimeHours || ""}
                  onChange={(event) =>
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId
                          ? { ...item, overtimeHours: Number(event.target.value) || 0 }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
            {outOfTown ? (
              <label className="mt-3 flex items-center gap-2 text-sm text-forest/70">
                <input
                  type="checkbox"
                  checked={row.applyAllowance !== false}
                  onChange={(event) =>
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId ? { ...item, applyAllowance: event.target.checked } : item,
                      ),
                    )
                  }
                />
                Aplicar ajuda de custo ({formatBRL(rateFor(rates, functionKey).allowance)})
              </label>
            ) : null}
          </div>
        );
      })}
      {available.length ? (
        <select
          className={fieldControlClass}
          value=""
          onChange={(event) => {
            const worker = workers.find((item) => item.id === event.target.value);
            if (!worker) return;
            onChange([
              ...allocations,
              {
                id: worker.id,
                workerId: worker.id,
                functionKey: workerFunctionKeys(worker)[0] || "",
                overtime: false,
                overtimeHours: 0,
                applyAllowance: true,
              },
            ]);
          }}
        >
          <option value="">Selecionar prestador…</option>
          {available.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name} · {workerFunctionsLabel(worker)}
            </option>
          ))}
        </select>
      ) : allocations.length ? (
        <p className="text-xs font-light text-forest/45">Todos os prestadores cadastrados já estão neste evento.</p>
      ) : null}
    </div>
  );
}

function ExtraStaffPicker({
  used,
  onAdd,
}: {
  used: Set<string>;
  onAdd: (key: ExtraStaffRoleKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = PICKABLE_EXTRA_STAFF_ROLES.filter((role) => !used.has(role.key));
  if (available.length === 0) return null;

  return (
    <div className="relative">
      <Button type="button" variant="outline" className="h-10 px-4" onClick={() => setOpen((value) => !value)}>
        <Plus data-icon="inline-start" />
        Acrescentar função
      </Button>
      {open ? (
        <div className="absolute z-20 mt-2 max-h-64 w-72 overflow-y-auto rounded-xl border border-forest/10 bg-white p-1 shadow-xl">
          {available.map((role) => (
            <button
              key={role.key}
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-forest hover:bg-forest/[0.05]"
              onClick={() => {
                onAdd(role.key);
                setOpen(false);
              }}
            >
              {role.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EventChangeHistory({
  entries,
  clientNameById,
}: {
  entries: EventRecord["changeLog"];
  clientNameById: Map<string, string>;
}) {
  const pretty = (label: string, value: string) => {
    if (label !== "Cliente" || value === "(vazio)" || !value) return value;
    return clientNameById.get(value) ?? value;
  };
  const log = [...entries].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
      <SectionTitle
        title="Histórico de alterações"
        hint="Quem editou esta ficha, quando, e o que mudou."
      />
      {log.length === 0 ? (
        <p className="text-sm font-light text-forest/55">
          Ainda não há alterações registradas nesta ficha. As próximas edições aparecem aqui, com
          data, horário e o usuário que salvou.
        </p>
      ) : (
        <ol className="space-y-4">
          {log.map((entry) => (
            <li key={entry.id} className="border-b border-forest/8 pb-4 last:border-0 last:pb-0">
              <p className="text-sm text-forest">
                <span className="font-medium">{entry.userName}</span>
                <span className="font-light text-forest/50"> · {formatDateTime(entry.at)}</span>
              </p>
              {entry.clientLabel || entry.reason ? (
                <p className="mt-1 text-sm font-light text-forest/60">
                  {entry.clientLabel ? `Cliente: ${entry.clientLabel}` : null}
                  {entry.clientLabel && entry.reason ? " · " : null}
                  {entry.reason ? `Motivo: ${entry.reason}` : null}
                </p>
              ) : null}
              <ul className="mt-2 space-y-1 text-sm font-light text-forest/70">
                {entry.changes.map((change, index) => (
                  <li key={`${entry.id}-${change.label}-${index}`}>
                    <span className="font-medium text-forest/80">{change.label}:</span>{" "}
                    {pretty(change.label, change.from)} → {pretty(change.label, change.to)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CatalogDishPicker({
  dishes,
  categoryOrder,
  selected,
  onChange,
}: {
  dishes: DishRecord[];
  categoryOrder: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  if (dishes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-forest/20 p-4 text-sm font-light text-forest/50">
        Nenhum prato no catálogo ainda. Cadastre em Cadastros → Cardápio.
      </p>
    );
  }

  const query = search.trim().toLocaleLowerCase("pt-BR");
  const visibleDishes = query
    ? dishes.filter((dish) => dish.name.toLocaleLowerCase("pt-BR").includes(query))
    : dishes;

  const selectedSet = new Set(selected);
  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const extras = [
    ...new Set(visibleDishes.map((dish) => dish.category).filter((category) => !categoryOrder.includes(category))),
  ];
  const groups = [...categoryOrder, ...extras]
    .map((category) => ({
      category,
      items: visibleDishes
        .filter((dish) => dish.category === category)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar prato…" />
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-forest/20 p-4 text-sm font-light text-forest/50">
          Nenhum prato encontrado para “{search.trim()}”.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 text-[13px] font-medium text-forest/55">{group.category}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((dish) => {
                const checked = selectedSet.has(dish.id);
                return (
                  <label
                    key={dish.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-forest/30 bg-forest/8"
                        : "border-forest/10 hover:bg-forest/[0.03]",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      checked={checked}
                      onChange={() => toggle(dish.id)}
                    />
                    <span className="text-forest">{dish.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={fieldControlClass}
        value={value}
        onChange={(event) => onChange(event.target.value as YesNo)}
      >
        <option value="">—</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </Field>
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
      <h3 className="mb-3 text-[13px] font-medium text-forest/55">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr>
              <th className="field-label w-36 px-2 pb-2 font-normal">Per capita</th>
              <th className="field-label px-2 pb-2 font-normal">Prato / variação</th>
              <th className="field-label px-2 pb-2 font-normal">Obs / variação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t border-forest/8">
                <td className="p-2">
                  <input
                    className={fieldControlClass}
                    value={item.quantity}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, quantity: event.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="p-2">
                  <input
                    className={fieldControlClass}
                    value={item.name}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, name: event.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="p-2">
                  <input
                    className={fieldControlClass}
                    value={item.notes}
                    onChange={(event) => {
                      const next = [...items];
                      next[index] = { ...item, notes: event.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="p-2 text-right">
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((row) => row.id !== item.id))}
                    className="text-forest/35 transition-colors hover:text-terracotta"
                    aria-label="Remover"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
