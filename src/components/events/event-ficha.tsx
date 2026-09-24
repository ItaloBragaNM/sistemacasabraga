"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ClipboardList, FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClienteForm } from "@/components/cadastros/cliente-form";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { Modal, SearchInput } from "@/components/cadastros/ui";
import { EventDrinksFields, EventUniformsFields } from "@/components/events/drinks-uniforms";
import { KitchenPdfPicker } from "@/components/events/kitchen-pdf-picker";
import { fieldControlClass, fieldControlCompactClass, Field, FichaSection } from "@/components/events/field";
import { StatusBadge } from "@/components/events/status-badge";
import { useEvents } from "@/components/events/events-provider";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { downloadVehicleChecklistPdf } from "@/components/veiculos/checklist-pdf";
import { useVeiculosUso } from "@/components/veiculos/veiculos-uso-provider";
import type { DishRecord } from "@/lib/cadastros/types";
import { VEHICLE_USAGE_CATEGORY_LABELS } from "@/lib/cadastros/types";
import { formatBRL } from "@/lib/crm/format";
import { formatDateTime, formatLongDate, formatWeekday } from "@/lib/dates";
import { menuFromPlan, uid, upsertMenuPlanFromDishes } from "@/lib/event-factory";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, UNIFORM_SIZE_LABELS, VENUE_KIND_LABELS } from "@/lib/labels";
import {
  ALCOHOL_TYPES,
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_ATTACHMENT_MAX_FILES,
  EVENT_STATUSES,
  EVENT_TYPES,
  PICKABLE_EXTRA_STAFF_ROLES,
  extraStaffLabel,
  eventMenuSections,
  guestTotal,
  normalizeEventRecord,
  normalizeGuests,
  STAFF_ROLES,
  suggestedDrinkQuantities,
  DEFAULT_DRINK_PREMISES,
  UNIFORM_PIECES,
  type ExtraStaffRoleKey,
  type EventLaborAllocation,
  type EventMenuSection,
  type EventRecord,
  type EventSaveMeta,
  type Guests,
  type Logistics,
  type UniformPieceKey,
  type VenueKind,
  type YesNo,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { laborLineAmounts, rateFor, type EventLaborExtras } from "@/lib/mao-de-obra/calc";
import { LABOR_FUNCTIONS, type ExternalWorker, type LaborRate } from "@/lib/mao-de-obra/types";
import { applyLaborUniformDelta } from "@/lib/mao-de-obra/uniforms";

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
  const { events } = useEvents();
  const { data: cadastros, upsertCliente } = useCadastros();
  const { data: maoDeObra, reload: reloadLabor } = useMaoDeObra();
  const { markGenerated } = useVeiculosUso();
  const [draft, setDraft] = useState(() => normalizeEventRecord(event));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "working">("idle");
  const [pdfModal, setPdfModal] = useState(false);
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
  const dishPopularity = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of events) {
      for (const id of item.selectedDishIds ?? []) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [events]);

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

  const setMenuPlan = (plan: EventMenuSection[]) => {
    setDraft((current) => ({
      ...current,
      menuPlan: plan,
      menu: menuFromPlan(plan),
    }));
  };

  const patchLogistics = (patch: Partial<Logistics>) => {
    setDraft((current) => ({
      ...current,
      logistics: { ...current.logistics, ...patch },
    }));
  };

  const addAttachments = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...(draft.attachments ?? [])];
    for (const file of Array.from(files)) {
      if (next.length >= EVENT_ATTACHMENT_MAX_FILES) {
        toast.error(`Máximo de ${EVENT_ATTACHMENT_MAX_FILES} arquivos.`);
        break;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`“${file.name}” não é foto ou vídeo.`);
        continue;
      }
      if (file.size > EVENT_ATTACHMENT_MAX_BYTES) {
        toast.error(`“${file.name}” ultrapassa 500 KB.`);
        continue;
      }
      try {
        next.push({
          id: uid(),
          name: file.name,
          mime: file.type,
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        });
      } catch {
        toast.error(`Não foi possível ler “${file.name}”.`);
      }
    }
    update("attachments", next);
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
    const plan = upsertMenuPlanFromDishes(eventMenuSections(draft), dishes);
    setDraft((current) => ({
      ...current,
      menuPlan: plan,
      menu: menuFromPlan(plan),
    }));
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
    <div className="mx-auto max-w-6xl space-y-4 pb-28">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
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
            {[
              draft.date ? `${formatWeekday(draft.date)}, ${formatLongDate(draft.date)}` : "Data a definir",
              clientName,
              draft.ceremonyTime ? `Horário da cerimônia ${draft.ceremonyTime}` : "",
              draft.invitationTime ? `Horário do convite ${draft.invitationTime}` : "",
              draft.serviceTime ? `Horário do serviço ${draft.serviceTime}` : "",
              draft.serviceDuration ? `Duração do serviço ${draft.serviceDuration}` : "",
              `${guestTotal(draft.guests)} a servir`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <FichaActionButtons
            dirty={dirty}
            saveState={saveState}
            pdfState={pdfState}
            onSave={openSaveModal}
            onPdf={() => setPdfModal(true)}
          />
          <Button
            variant="outline"
            className="size-9 p-0 text-terracotta"
            aria-label="Excluir ficha"
            onClick={() => {
              if (window.confirm("Excluir esta ficha? A ação não pode ser desfeita neste aparelho.")) {
                onDelete(draft.id);
                toast.success("Ficha excluída.");
                router.push("/eventos");
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <FichaSection title="Dados do evento" compact>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="★ Nome do evento" className="md:col-span-2">
            <input
              className={fieldControlCompactClass}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </Field>
          <Field label="★ Tipo do evento">
            <select
              className={fieldControlCompactClass}
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
                className={cn(fieldControlCompactClass, "min-w-0 flex-1")}
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
                className="h-8 shrink-0 px-2"
                onClick={() => setClientModal(true)}
                aria-label="Cadastrar cliente"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </Field>
          <Field label="Status interno">
            <select
              className={fieldControlCompactClass}
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
              className={fieldControlCompactClass}
              value={draft.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>
          <Field label="Entrega de material">
            <input
              type="date"
              className={fieldControlCompactClass}
              value={draft.materialDeliveryDate}
              onChange={(event) => update("materialDeliveryDate", event.target.value)}
            />
          </Field>
          <Field label="Recolhimento de material">
            <input
              type="date"
              className={fieldControlCompactClass}
              value={draft.materialPickupDate ?? ""}
              onChange={(event) => update("materialPickupDate", event.target.value)}
            />
          </Field>
          <Field label="Entrega de comida">
            <input
              type="date"
              className={fieldControlCompactClass}
              value={draft.foodDeliveryDate}
              onChange={(event) => update("foodDeliveryDate", event.target.value)}
            />
          </Field>
          <Field label="Tipo de local">
            <select
              className={fieldControlCompactClass}
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
          <Field label="Duração do serviço">
            <input
              className={fieldControlCompactClass}
              value={draft.serviceDuration ?? ""}
              onChange={(event) => update("serviceDuration", event.target.value)}
              placeholder="Ex.: 6 horas"
            />
          </Field>
          <Field label="Local / endereço" className="md:col-span-2">
            <input
              className={fieldControlCompactClass}
              value={draft.venue.address}
              onChange={(event) =>
                update("venue", { ...draft.venue, address: event.target.value })
              }
            />
          </Field>
          <Field label="★ Adultos">
            <input
              type="number"
              min={0}
              className={fieldControlCompactClass}
              value={draft.guests.adults}
              onChange={(event) =>
                setGuests({ ...draft.guests, adults: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Crianças 0 a 5">
            <input
              type="number"
              min={0}
              className={fieldControlCompactClass}
              value={draft.guests.children0to5 ?? 0}
              onChange={(event) =>
                setGuests({ ...draft.guests, children0to5: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Crianças 5 a 10">
            <input
              type="number"
              min={0}
              className={fieldControlCompactClass}
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
              className={fieldControlCompactClass}
              value={draft.guests.professionals}
              onChange={(event) =>
                setGuests({
                  ...draft.guests,
                  professionals: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Chegada da equipe">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.teamArrival}
              onChange={(event) => update("teamArrival", event.target.value)}
            />
          </Field>
          <Field label="Horário da cerimônia">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.ceremonyTime ?? ""}
              onChange={(event) => update("ceremonyTime", event.target.value)}
            />
          </Field>
          <Field label="Horário do convite">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.invitationTime}
              onChange={(event) => update("invitationTime", event.target.value)}
            />
          </Field>
          <Field label="Horário do serviço">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.serviceTime}
              onChange={(event) => update("serviceTime", event.target.value)}
            />
          </Field>
        </div>
      </FichaSection>

      <FichaSection title="Equipe" compact>
        <p className="mb-2 text-[12px] font-medium text-forest/50">Casa</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {STAFF_ROLES.map((role) => (
            <Field key={role.key} label={role.label}>
              <input
                type="number"
                min={0}
                className={fieldControlCompactClass}
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
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {draft.extraStaff.map((line) => (
              <Field key={line.key} label={extraStaffLabel(line.key)}>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    className={cn(fieldControlCompactClass, "min-w-0 flex-1")}
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
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-forest/35 hover:text-terracotta"
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
          <div className="mt-3">
            <ExtraStaffPicker
              used={new Set([
                ...(draft.extraStaff ?? []).map((line) => line.key),
                ...STAFF_ROLES.map((role) => role.key),
              ])}
              onAdd={(key) =>
                update("extraStaff", [...(draft.extraStaff ?? []), { key, quantity: 1 }])
              }
            />
          </div>
        ) : null}

        <p className="mb-2 mt-5 text-[12px] font-medium text-forest/50">Externa</p>
        {(maoDeObra?.workers ?? []).length === 0 ? (
          <p className="text-sm font-light text-forest/50">
            Cadastre os prestadores em Cadastros → Equipe externa.
          </p>
        ) : (
          <EventLaborAllocations
            allocations={draft.laborAllocations ?? []}
            extras={{
              overtime: draft.laborOvertime,
              overtimeHours: draft.laborOvertimeHours,
              applyAllowance: draft.laborApplyAllowance,
            }}
            workers={maoDeObra?.workers ?? []}
            rates={maoDeObra?.rates ?? []}
            onExtrasChange={(extras) =>
              setDraft((current) => ({
                ...current,
                laborOvertime: extras.overtime,
                laborOvertimeHours: extras.overtimeHours,
                laborApplyAllowance: extras.applyAllowance,
              }))
            }
            onChange={(next) =>
              setDraft((current) => ({
                ...current,
                laborAllocations: next,
                uniforms: applyLaborUniformDelta(
                  current.uniforms,
                  current.laborAllocations ?? [],
                  next,
                  maoDeObra?.workers ?? [],
                ),
              }))
            }
          />
        )}

        <p className="mb-2 mt-5 text-[12px] font-medium text-forest/50">Fardamento</p>
        <EventUniformsFields
          embedded
          uniforms={draft.uniforms}
          onChange={(piece, size, value) =>
            update("uniforms", {
              ...draft.uniforms,
              [piece]: { ...draft.uniforms[piece], [size]: value },
            })
          }
        />
      </FichaSection>

      <FichaSection title="Pratos do cardápio (catálogo)">
        <CatalogDishPicker
          dishes={cadastros?.dishes ?? []}
          categoryOrder={cadastros?.dishCategories ?? []}
          selected={draft.selectedDishIds ?? []}
          popularity={dishPopularity}
          onChange={(ids) => update("selectedDishIds", ids)}
        />
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
      </FichaSection>

      <FichaSection title="Cardápio do evento">
        <MenuPlanEditor sections={eventMenuSections(draft)} onChange={setMenuPlan} />
      </FichaSection>

      <EventDrinksFields
        drinks={draft.drinks}
        notes={draft.drinksNotes}
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

      <FichaSection title="Extras e logística">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ilhas (estações)">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.islands ?? 0}
              onChange={(event) => update("islands", Number(event.target.value))}
            />
          </Field>
          <YesNoField
            label="Bebidas alcoólicas"
            value={draft.logistics.alcoholServed}
            onChange={(value) =>
              patchLogistics({
                alcoholServed: value,
                alcoholTypes: value === "nao" ? [] : draft.logistics.alcoholTypes,
              })
            }
          />
        </div>
        {draft.logistics.alcoholServed === "sim" ? (
          <div className="mt-4 rounded-xl border border-forest/10 bg-cream/50 p-4">
            <p className="field-label mb-3">Quais tipos serão servidos</p>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {ALCOHOL_TYPES.map((item) => {
                const checked = draft.logistics.alcoholTypes.includes(item.key);
                return (
                  <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm text-forest">
                    <input
                      type="checkbox"
                      className="size-4 accent-forest"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? draft.logistics.alcoholTypes.filter((key) => key !== item.key)
                          : [...draft.logistics.alcoholTypes, item.key];
                        patchLogistics({ alcoholTypes: next });
                      }}
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
            {draft.logistics.alcoholTypes.includes("outros") ? (
              <input
                className={cn(fieldControlClass, "mt-3")}
                value={draft.logistics.alcohol}
                onChange={(event) => patchLogistics({ alcohol: event.target.value })}
                placeholder="Detalhe outras bebidas"
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          <p className="mb-3 text-[13px] font-medium text-forest/45">Observações da logística</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <YesNoField
              label="Material no dia anterior"
              value={draft.logistics.materialPreviousDay}
              onChange={(value) => patchLogistics({ materialPreviousDay: value })}
            />
            <YesNoField
              label="Mesa cavalete"
              value={draft.logistics.trestleTable}
              onChange={(value) => patchLogistics({ trestleTable: value })}
            />
            <YesNoField
              label="Recolher material ao final"
              value={draft.logistics.mustCollectMaterial}
              onChange={(value) => patchLogistics({ mustCollectMaterial: value })}
            />
            <YesNoField
              label="Conservação extra"
              value={draft.logistics.extraConservation}
              onChange={(value) =>
                patchLogistics({
                  extraConservation: value,
                  extraConservationQty: value === "sim" ? draft.logistics.extraConservationQty : "",
                })
              }
            />
            {draft.logistics.extraConservation === "sim" ? (
              <Field label="Quantidade — conservação extra">
                <input
                  className={fieldControlClass}
                  value={draft.logistics.extraConservationQty}
                  onChange={(event) => patchLogistics({ extraConservationQty: event.target.value })}
                />
              </Field>
            ) : null}
            <YesNoField
              label="Gelo cubo"
              value={draft.logistics.iceCubes}
              onChange={(value) =>
                patchLogistics({
                  iceCubes: value,
                  iceCubesQty: value === "sim" ? draft.logistics.iceCubesQty : "",
                })
              }
            />
            {draft.logistics.iceCubes === "sim" ? (
              <Field label="Quantidade — gelo cubo">
                <input
                  className={fieldControlClass}
                  value={draft.logistics.iceCubesQty}
                  onChange={(event) => patchLogistics({ iceCubesQty: event.target.value })}
                />
              </Field>
            ) : null}
            <YesNoField
              label="Local com cozinha"
              value={draft.logistics.hasKitchen}
              onChange={(value) => patchLogistics({ hasKitchen: value })}
            />
            <YesNoField
              label="Local com pia"
              value={draft.logistics.hasSink}
              onChange={(value) => patchLogistics({ hasSink: value })}
            />
            <YesNoField
              label="Local com geladeira"
              value={draft.logistics.hasFridge}
              onChange={(value) => patchLogistics({ hasFridge: value })}
            />
            <YesNoField
              label="Local com fogão"
              value={draft.logistics.hasStove}
              onChange={(value) => patchLogistics({ hasStove: value })}
            />
            <YesNoField
              label="Local com freezer"
              value={draft.logistics.hasFreezer}
              onChange={(value) => patchLogistics({ hasFreezer: value })}
            />
            <YesNoField
              label="Local com forno"
              value={draft.logistics.hasOven}
              onChange={(value) => patchLogistics({ hasOven: value })}
            />
            <YesNoField
              label="Local com micro-ondas"
              value={draft.logistics.hasMicrowave}
              onChange={(value) => patchLogistics({ hasMicrowave: value })}
            />
          </div>
          <Field label="Notas da equipe de logística" className="mt-4">
            <textarea
              className={cn(fieldControlClass, "min-h-24 py-2")}
              value={draft.logisticsNotes ?? ""}
              onChange={(event) => update("logisticsNotes", event.target.value)}
              placeholder="Materiais, local do evento e demais notas da logística."
            />
          </Field>
        </div>
      </FichaSection>

      <FichaSection title="Veículos">
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
      </FichaSection>

      <FichaSection title="Observações — cozinha">
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
        <Field label="Gerenciais e Evento" className="mt-4">
          <textarea
            className={cn(fieldControlClass, "min-h-28 py-3")}
            value={draft.managementNotes ?? ""}
            onChange={(event) => update("managementNotes", event.target.value)}
            placeholder="Notas gerenciais deste evento."
          />
        </Field>
        <Field
          label="Fotos e vídeos"
          className="mt-4"
        >
          <p className="mb-2 text-xs font-light text-forest/50">
            Até {EVENT_ATTACHMENT_MAX_FILES} arquivos, 500 KB cada.
          </p>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="block w-full text-sm text-forest file:mr-3 file:rounded-lg file:border-0 file:bg-forest/8 file:px-3 file:py-2 file:text-sm file:text-forest"
            onChange={(event) => {
              void addAttachments(event.target.files);
              event.target.value = "";
            }}
          />
          {(draft.attachments ?? []).length ? (
            <ul className="mt-3 space-y-2">
              {(draft.attachments ?? []).map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-forest/10 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-forest">{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${file.name}`}
                    className="flex size-8 shrink-0 items-center justify-center text-forest/35 hover:text-terracotta"
                    onClick={() =>
                      update(
                        "attachments",
                        (draft.attachments ?? []).filter((item) => item.id !== file.id),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
      </FichaSection>

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

      <KitchenPdfPicker
        open={pdfModal}
        event={draft}
        working={pdfState === "working"}
        onClose={() => setPdfModal(false)}
        onWorking={(value) => setPdfState(value ? "working" : "idle")}
      />

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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end p-4 sm:p-5 lg:p-8">
        <div className="pointer-events-auto rounded-2xl border border-forest/10 bg-white/95 p-2 shadow-lg backdrop-blur">
          <FichaActionButtons
            dirty={dirty}
            saveState={saveState}
            pdfState={pdfState}
            onSave={openSaveModal}
            onPdf={() => setPdfModal(true)}
          />
        </div>
      </div>
    </div>
  );
}

function FichaActionButtons({
  dirty,
  saveState,
  pdfState,
  onSave,
  onPdf,
}: {
  dirty: boolean;
  saveState: "idle" | "saving" | "saved";
  pdfState: "idle" | "working";
  onSave: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2">
      <Button
        className="h-9 bg-forest px-3 text-cream hover:bg-petrol"
        disabled={!dirty || saveState === "saving"}
        onClick={onSave}
      >
        {saveState === "saving" ? "Salvando…" : "Salvar"}
      </Button>
      <Button
        className="h-9 bg-terracotta px-3 text-cream hover:bg-terracotta/90"
        disabled={pdfState === "working"}
        onClick={onPdf}
      >
        {pdfState === "working" ? "Gerando…" : "PDF"}
      </Button>
    </div>
  );
}

function EventLaborAllocations({
  allocations,
  extras,
  workers,
  rates,
  onChange,
  onExtrasChange,
}: {
  allocations: EventLaborAllocation[];
  extras: EventLaborExtras;
  workers: ExternalWorker[];
  rates: LaborRate[];
  onChange: (next: EventLaborAllocation[]) => void;
  onExtrasChange: (next: EventLaborExtras) => void;
}) {
  const used = new Set(allocations.map((item) => item.workerId));
  const available = workers.filter((worker) => !used.has(worker.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <YesNoField
          label="Ajuda de custo"
          value={extras.applyAllowance ? "sim" : "nao"}
          onChange={(value) => onExtrasChange({ ...extras, applyAllowance: value === "sim" })}
        />
        <YesNoField
          label="Hora extra"
          value={extras.overtime ? "sim" : "nao"}
          onChange={(value) =>
            onExtrasChange({
              ...extras,
              overtime: value === "sim",
              overtimeHours: value === "sim" ? extras.overtimeHours : 0,
            })
          }
        />
        <Field label="Quantidade de horas extras">
          <input
            type="number"
            min={0}
            step="0.5"
            className={fieldControlClass}
            disabled={!extras.overtime}
            value={extras.overtime ? extras.overtimeHours || "" : ""}
            onChange={(event) =>
              onExtrasChange({ ...extras, overtimeHours: Number(event.target.value) || 0 })
            }
          />
        </Field>
      </div>
      {allocations.map((row) => {
        const worker = workerById.get(row.workerId);
        const functionKey = row.functionKey || LABOR_FUNCTIONS[0]?.key || "";
        const rate = rateFor(rates, functionKey);
        const dailyValue =
          typeof row.daily === "number" && Number.isFinite(row.daily) ? row.daily : rate.daily;
        const amounts = laborLineAmounts({ ...row, functionKey, daily: dailyValue }, rate, extras);
        return (
          <div key={row.workerId} className="rounded-xl border border-forest/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-forest">{worker?.name || "Prestador removido"}</p>
                <p className="text-xs font-light text-forest/45">
                  {formatBRL(amounts.total)}
                  {amounts.allowance ? ` · ajuda ${formatBRL(amounts.allowance)}` : ""}
                  {amounts.overtimeHours ? ` · ${amounts.overtimeHours}h extra` : ""}
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
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Função neste evento" className="sm:col-span-2">
                <select
                  className={fieldControlClass}
                  value={functionKey}
                  onChange={(event) => {
                    const nextKey = event.target.value;
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId
                          ? { ...item, functionKey: nextKey, daily: rateFor(rates, nextKey).daily }
                          : item,
                      ),
                    );
                  }}
                >
                  {LABOR_FUNCTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fardamento">
                <select
                  className={fieldControlClass}
                  value={row.uniformPiece || ""}
                  onChange={(event) =>
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId
                          ? { ...item, uniformPiece: (event.target.value || "") as UniformPieceKey | "" }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Sem farda</option>
                  {UNIFORM_PIECES.map((piece) => {
                    const size = worker?.uniformSizes?.[piece.key];
                    return (
                      <option key={piece.key} value={piece.key}>
                        {piece.label}
                        {size ? ` · ${UNIFORM_SIZE_LABELS[size]}` : " · sem tamanho"}
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field label="Diária (R$)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldControlClass}
                  value={dailyValue || ""}
                  onChange={(event) =>
                    onChange(
                      allocations.map((item) =>
                        item.workerId === row.workerId
                          ? { ...item, daily: Number(event.target.value) || 0 }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
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
            const functionKey = LABOR_FUNCTIONS[0]?.key ?? "";
            onChange([
              ...allocations,
              {
                id: worker.id,
                workerId: worker.id,
                functionKey,
                overtime: extras.overtime,
                overtimeHours: extras.overtimeHours,
                applyAllowance: extras.applyAllowance,
                daily: rateFor(rates, functionKey).daily,
                uniformPiece: "",
              },
            ]);
          }}
        >
          <option value="">Selecionar prestador…</option>
          {available.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
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
    <FichaSection title="Histórico de alterações">
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
    </FichaSection>
  );
}

function CatalogDishPicker({
  dishes,
  categoryOrder,
  selected,
  popularity,
  onChange,
}: {
  dishes: DishRecord[];
  categoryOrder: string[];
  selected: string[];
  popularity: Map<string, number>;
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
  const selectedSet = new Set(selected);
  const selectedDishes = dishes
    .filter((dish) => selectedSet.has(dish.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const byPopularity = (a: DishRecord, b: DishRecord) => {
    const pop = (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0);
    if (pop) return pop;
    return a.name.localeCompare(b.name, "pt-BR");
  };
  const searchHits = query
    ? dishes
        .filter(
          (dish) =>
            !selectedSet.has(dish.id) && dish.name.toLocaleLowerCase("pt-BR").includes(query),
        )
        .sort(byPopularity)
    : [];
  const topHits = searchHits.filter((dish) => (popularity.get(dish.id) ?? 0) > 0);
  const otherHits = searchHits.filter((dish) => (popularity.get(dish.id) ?? 0) === 0);

  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const extras = [
    ...new Set(
      [...selectedDishes, ...searchHits]
        .map((dish) => dish.category)
        .filter((category) => !categoryOrder.includes(category)),
    ),
  ];
  const groupsFor = (items: DishRecord[]) =>
    [...categoryOrder, ...extras]
      .map((category) => ({
        category,
        items: items
          .filter((dish) => dish.category === category)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      }))
      .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar prato…" />
      {selectedDishes.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[13px] font-medium text-forest/55">Selecionados</p>
          {groupsFor(selectedDishes).map((group) => (
            <DishGroup
              key={`sel-${group.category}`}
              group={group}
              selectedSet={selectedSet}
              popularity={popularity}
              onToggle={toggle}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm font-light text-forest/50">Nenhum prato selecionado. Use a busca para incluir.</p>
      )}
      {query ? (
        searchHits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-forest/20 p-4 text-sm font-light text-forest/50">
            Nenhum prato encontrado para “{search.trim()}”.
          </p>
        ) : (
          <div className="space-y-3">
            {topHits.length > 0 ? (
              <div>
                <p className="mb-2 text-[13px] font-medium text-forest/55">Mais usados no cardápio</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {topHits.slice(0, 8).map((dish) => (
                    <DishChoice
                      key={`pop-${dish.id}`}
                      dish={dish}
                      checked={false}
                      uses={popularity.get(dish.id) ?? 0}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {topHits.length === 0 || otherHits.length > 0 ? (
              <>
                <p className="text-[13px] font-medium text-forest/55">Resultados</p>
                {groupsFor(topHits.length ? otherHits : searchHits).map((group) => (
                  <DishGroup
                    key={`hit-${group.category}`}
                    group={group}
                    selectedSet={selectedSet}
                    popularity={popularity}
                    onToggle={toggle}
                  />
                ))}
              </>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function DishGroup({
  group,
  selectedSet,
  popularity,
  onToggle,
}: {
  group: { category: string; items: DishRecord[] };
  selectedSet: Set<string>;
  popularity: Map<string, number>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-medium text-forest/55">{group.category}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.items.map((dish) => (
          <DishChoice
            key={dish.id}
            dish={dish}
            checked={selectedSet.has(dish.id)}
            uses={popularity.get(dish.id) ?? 0}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function DishChoice({
  dish,
  checked,
  uses,
  onToggle,
}: {
  dish: DishRecord;
  checked: boolean;
  uses: number;
  onToggle: (id: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
        checked ? "border-forest/30 bg-forest/8" : "border-forest/10 hover:bg-forest/[0.03]",
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-forest"
        checked={checked}
        onChange={() => onToggle(dish.id)}
      />
      <span className="min-w-0 flex-1 text-forest">
        {dish.name}
        {uses > 0 ? (
          <span className="ml-1 text-[11px] font-light text-forest/45">
            {uses} {uses === 1 ? "evento" : "eventos"}
          </span>
        ) : null}
      </span>
    </label>
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
      <div className="flex h-10 items-center gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-forest">
          <input
            type="checkbox"
            className="size-4 accent-forest"
            checked={value === "sim"}
            onChange={() => onChange(value === "sim" ? "" : "sim")}
          />
          Sim
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-forest">
          <input
            type="checkbox"
            className="size-4 accent-forest"
            checked={value === "nao"}
            onChange={() => onChange(value === "nao" ? "" : "nao")}
          />
          Não
        </label>
      </div>
    </Field>
  );
}

function MenuPlanEditor({
  sections,
  onChange,
}: {
  sections: EventMenuSection[];
  onChange: (next: EventMenuSection[]) => void;
}) {
  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const patchSection = (index: number, patch: Partial<EventMenuSection>) => {
    onChange(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)));
  };

  const moveItem = (sectionIndex: number, itemIndex: number, direction: -1 | 1) => {
    const items = [...sections[sectionIndex].items];
    const target = itemIndex + direction;
    if (target < 0 || target >= items.length) return;
    [items[itemIndex], items[target]] = [items[target], items[itemIndex]];
    patchSection(sectionIndex, { items });
  };

  const moveItemToSection = (fromSection: number, itemIndex: number, toSectionId: string) => {
    const item = sections[fromSection]?.items[itemIndex];
    if (!item) return;
    onChange(
      sections.map((section, index) => {
        if (index === fromSection) {
          return { ...section, items: section.items.filter((_, i) => i !== itemIndex) };
        }
        if (section.id === toSectionId) {
          return { ...section, items: [...section.items, item] };
        }
        return section;
      }),
    );
  };

  const removeSection = (index: number) => {
    const section = sections[index];
    const linked = section.items.filter((item) => item.name.trim()).length;
    if (linked > 0) {
      toast.error("Mova os pratos antes de excluir a seção.");
      return;
    }
    onChange(sections.filter((_, i) => i !== index));
  };

  const addSection = () => {
    onChange([...sections, { id: uid(), title: "Nova seção", time: "", items: [] }]);
  };

  if (sections.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-dashed border-forest/20 p-4 text-sm font-light text-forest/50">
          Nenhum prato neste cardápio. Selecione no catálogo e clique em Gerar Per Capita, ou crie uma seção para organizar.
        </p>
        <Button type="button" variant="outline" className="h-9 px-4" onClick={addSection}>
          <Plus data-icon="inline-start" />
          Nova seção
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {sections.map((section, sectionIndex) => (
        <div key={section.id}>
          <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <Field label="Seção">
              <input
                className={fieldControlClass}
                value={section.title}
                onChange={(event) => patchSection(sectionIndex, { title: event.target.value })}
              />
            </Field>
            <Field label="Horário">
              <input
                type="time"
                className={fieldControlClass}
                value={section.time}
                onChange={(event) => patchSection(sectionIndex, { time: event.target.value })}
              />
            </Field>
            <div className="flex items-end gap-1 pb-0.5">
              <button
                type="button"
                aria-label="Subir seção"
                className="flex size-10 items-center justify-center rounded-lg text-forest/35 hover:text-forest disabled:opacity-30"
                disabled={sectionIndex === 0}
                onClick={() => moveSection(sectionIndex, -1)}
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Descer seção"
                className="flex size-10 items-center justify-center rounded-lg text-forest/35 hover:text-forest disabled:opacity-30"
                disabled={sectionIndex === sections.length - 1}
                onClick={() => moveSection(sectionIndex, 1)}
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Excluir seção"
                className="flex size-10 items-center justify-center rounded-lg text-forest/35 hover:text-terracotta"
                onClick={() => removeSection(sectionIndex)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr>
                  <th className="field-label w-10 px-2 pb-2 font-normal" />
                  <th className="field-label w-36 px-2 pb-2 font-normal">Per capita</th>
                  <th className="field-label px-2 pb-2 font-normal">Prato / variação</th>
                  <th className="field-label px-2 pb-2 font-normal">Observações / variação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {section.items.map((item, itemIndex) => (
                  <tr key={item.id} className="border-t border-forest/8">
                    <td className="p-2">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label="Subir prato"
                          className="flex size-7 items-center justify-center text-forest/30 hover:text-forest disabled:opacity-30"
                          disabled={itemIndex === 0}
                          onClick={() => moveItem(sectionIndex, itemIndex, -1)}
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Descer prato"
                          className="flex size-7 items-center justify-center text-forest/30 hover:text-forest disabled:opacity-30"
                          disabled={itemIndex === section.items.length - 1}
                          onClick={() => moveItem(sectionIndex, itemIndex, 1)}
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        className={fieldControlClass}
                        value={item.quantity}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[itemIndex] = { ...item, quantity: event.target.value };
                          patchSection(sectionIndex, { items });
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className={fieldControlClass}
                        value={item.name}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[itemIndex] = { ...item, name: event.target.value };
                          patchSection(sectionIndex, { items });
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className={fieldControlClass}
                        value={item.notes}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[itemIndex] = { ...item, notes: event.target.value };
                          patchSection(sectionIndex, { items });
                        }}
                      />
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sections.length > 1 ? (
                          <select
                            className={cn(fieldControlClass, "h-9 w-36")}
                            value=""
                            aria-label="Mover prato para outra seção"
                            onChange={(event) => {
                              const toId = event.target.value;
                              if (!toId) return;
                              moveItemToSection(sectionIndex, itemIndex, toId);
                            }}
                          >
                            <option value="">Mover para…</option>
                            {sections
                              .filter((item) => item.id !== section.id)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.title || "Seção"}
                                </option>
                              ))}
                          </select>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            patchSection(sectionIndex, {
                              items: section.items.filter((row) => row.id !== item.id),
                            })
                          }
                          className="text-forest/35 transition-colors hover:text-terracotta"
                          aria-label="Remover"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="h-9 px-4" onClick={addSection}>
        <Plus data-icon="inline-start" />
        Nova seção
      </Button>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
