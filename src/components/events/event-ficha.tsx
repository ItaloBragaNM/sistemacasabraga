"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ClipboardList, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClienteForm } from "@/components/cadastros/cliente-form";
import { LocalForm } from "@/components/cadastros/local-form";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { Modal, SearchInput } from "@/components/cadastros/ui";
import { EventDrinksFields, EventUniformsFields } from "@/components/events/drinks-uniforms";
import { KitchenPdfPicker } from "@/components/events/kitchen-pdf-picker";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { fieldControlClass, fieldControlCompactClass, Field, FichaSection } from "@/components/events/field";
import { StatusBadge } from "@/components/events/status-badge";
import { useEvents } from "@/components/events/events-provider";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { AttachedMediaRow } from "@/components/ui/attached-media";
import { Button, buttonVariants } from "@/components/ui/button";
import { SearchablePicker, SearchableSelect } from "@/components/ui/searchable-select";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { applyLocalLogistics, venueFromLocal } from "@/lib/cadastros/locais";
import type { DishRecord, LocalRecord } from "@/lib/cadastros/types";
import { formatBRL } from "@/lib/crm/format";
import { formatDateTime, syncedFoodDepartureTime } from "@/lib/dates";
import { compressImageToDataUrl } from "@/lib/images";
import { menuFromPlan, menuItem, menuPlanNeedsPerCapita, uid, upsertMenuPlanFromDishes } from "@/lib/event-factory";
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
  laborUniformPieces,
  type ExtraStaffRoleKey,
  type EventAttachment,
  type EventLaborAllocation,
  type EventMenuSection,
  type EventRecord,
  type EventSaveMeta,
  type Guests,
  type Logistics,
  type VenueKind,
  type YesNo,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { stableEqual, threeWayMerge } from "@/lib/store/sync";
import { laborLineAmounts, rateFor, type EventLaborExtras } from "@/lib/mao-de-obra/calc";
import { LABOR_FUNCTIONS, type ExternalWorker, type LaborRate } from "@/lib/mao-de-obra/types";
import { applyLaborUniformDelta } from "@/lib/mao-de-obra/uniforms";

type Props = {
  event: EventRecord;
  onSave: (event: EventRecord, meta?: EventSaveMeta) => EventRecord | void;
  onDelete: (id: string) => void;
};

function snapshotForDirty(event: EventRecord) {
  const normalized = normalizeEventRecord(event);
  return JSON.stringify({ ...normalized, changeLog: undefined, updatedAt: undefined });
}

export function EventFicha({ event, onSave, onDelete }: Props) {
  const router = useRouter();
  const { events } = useEvents();
  const { data: cadastros, upsertCliente, upsertLocal } = useCadastros();
  const { data: maoDeObra, reload: reloadLabor } = useMaoDeObra();
  const [draft, setDraft] = useState(() => normalizeEventRecord(event));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "working">("idle");
  const [pdfModal, setPdfModal] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [localModal, setLocalModal] = useState(false);
  const [reasonModal, setReasonModal] = useState(false);
  const [reason, setReason] = useState("");
  const [changeAtLabel, setChangeAtLabel] = useState("");
  const [baseline, setBaseline] = useState(() => snapshotForDirty(event));
  const baselineEventRef = useRef(normalizeEventRecord(event));
  const drinkPremises = cadastros?.drinkPremises ?? DEFAULT_DRINK_PREMISES;
  const clientes = [...(cadastros?.clientes ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  const clientName = clientes.find((cliente) => cliente.id === draft.clientId)?.name;
  const clientMissing = Boolean(draft.clientId) && !clientName;
  const clientLabel = clientName || (clientMissing ? "Cliente não encontrado" : "Sem cliente");
  const locais = [...(cadastros?.locais ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const selectedLocal = locais.find((local) => local.id === draft.venueId);
  const localMissing = Boolean(draft.venueId) && !selectedLocal;
  const dirty = useMemo(() => snapshotForDirty(draft) !== baseline, [baseline, draft]);
  const draftRef = useRef(draft);
  const baselineRef = useRef(baseline);
  const remoteWarnRef = useRef<string | null>(null);
  draftRef.current = draft;
  baselineRef.current = baseline;
  const remoteEvent = useMemo(
    () => events.find((item) => item.id === event.id) ?? event,
    [event, events],
  );
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

  useEffect(() => {
    const incoming = normalizeEventRecord(remoteEvent);
    if (!dirty) {
      if (snapshotForDirty(incoming) === snapshotForDirty(draftRef.current)) return;
      setDraft(incoming);
      setBaseline(snapshotForDirty(incoming));
      baselineEventRef.current = incoming;
      return;
    }
    if (!incoming.updatedAt || incoming.updatedAt === draftRef.current.updatedAt) return;
    const merged = threeWayMerge(baselineEventRef.current, incoming, draftRef.current);
    if (stableEqual(merged, draftRef.current)) return;
    if (remoteWarnRef.current === incoming.updatedAt) return;
    remoteWarnRef.current = incoming.updatedAt;
    setDraft(merged);
    toast.success("Incorporamos as alterações de outro computador. O que você estava editando foi mantido.");
  }, [dirty, remoteEvent]);

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

  const addMenuSection = () => {
    setDraft((current) => {
      const plan = [...eventMenuSections(current), { id: uid(), title: "Nova seção", time: "", items: [] }];
      return { ...current, menuPlan: plan, menu: menuFromPlan(plan) };
    });
  };

  const patchLogistics = (patch: Partial<Logistics>) => {
    setDraft((current) => ({
      ...current,
      logistics: { ...current.logistics, ...patch },
    }));
  };

  const applyLocal = (local: LocalRecord | null) => {
    setDraft((current) => {
      if (!local) return { ...current, venueId: "" };
      return {
        ...current,
        venueId: local.id,
        venue: venueFromLocal(local),
        outOfTown: local.outOfTown,
        logistics: applyLocalLogistics(current.logistics, local),
      };
    });
  };

  const addAttachments = async (files: FileList | null) => {
    if (!files?.length) return;
    const additions: EventAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`“${file.name}” não é foto ou vídeo.`);
        continue;
      }
      if (file.size > EVENT_ATTACHMENT_MAX_BYTES) {
        toast.error(`“${file.name}” ultrapassa 500 KB.`);
        continue;
      }
      try {
        const dataUrl = file.type.startsWith("image/")
          ? await compressImageToDataUrl(file)
          : await readFileAsDataUrl(file);
        additions.push({
          id: uid(),
          name: file.name,
          mime: file.type.startsWith("image/") ? "image/jpeg" : file.type,
          size: file.size,
          dataUrl,
        });
      } catch (error) {
        toast.error(
          error instanceof Error && error.message === "too-large"
            ? `“${file.name}” ficou grande demais. Use outra imagem.`
            : `Não foi possível ler “${file.name}”.`,
        );
      }
    }
    if (!additions.length) return;
    setDraft((current) => {
      const existing = current.attachments ?? [];
      const room = EVENT_ATTACHMENT_MAX_FILES - existing.length;
      if (room <= 0) {
        toast.error(`Máximo de ${EVENT_ATTACHMENT_MAX_FILES} arquivos.`);
        return current;
      }
      if (additions.length > room) {
        toast.error(`Máximo de ${EVENT_ATTACHMENT_MAX_FILES} arquivos.`);
      }
      return { ...current, attachments: [...existing, ...additions.slice(0, room)] };
    });
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
    const selectedIds = draft.selectedDishIds ?? [];
    const selected = new Set(selectedIds);
    const dishes = (cadastros?.dishes ?? []).filter((dish) => selected.has(dish.id));
    const currentPlan = eventMenuSections(draft);
    if (
      dishes.length === 0 &&
      !menuPlanNeedsPerCapita(selectedIds, cadastros?.dishes ?? [], currentPlan)
    ) {
      toast.error("Selecione ao menos um prato do catálogo.");
      return;
    }
    const plan = upsertMenuPlanFromDishes(currentPlan, dishes);
    setDraft((current) => ({
      ...current,
      menuPlan: plan,
      menu: menuFromPlan(plan),
    }));
    toast.dismiss("gerar-per-capita");
    toast.success(
      dishes.length === 0
        ? "Cardápio atualizado. Os pratos do catálogo foram removidos."
        : `${dishes.length} prato${dishes.length === 1 ? "" : "s"} no cardápio do evento. Preencha o per capita e as observações.`,
    );
  };

  const needsPerCapita = useMemo(
    () =>
      menuPlanNeedsPerCapita(
        draft.selectedDishIds ?? [],
        cadastros?.dishes ?? [],
        eventMenuSections(draft),
      ),
    [cadastros?.dishes, draft],
  );

  const persistDraft = useCallback(
    (meta?: EventSaveMeta) => {
      const toSave = normalizeEventRecord(draftRef.current);
      const remote = events.find((item) => item.id === toSave.id);
      const merged = remote
        ? normalizeEventRecord(threeWayMerge(baselineEventRef.current, remote, toSave))
        : toSave;
      const snap = snapshotForDirty(merged);
      const hasReason = Boolean(meta?.reason?.trim());
      if (snap === baselineRef.current && !hasReason) return false;
      setSaveState("saving");
      const saved = onSave(merged, meta);
      const next = normalizeEventRecord(saved || merged);
      if (snapshotForDirty(draftRef.current) === snapshotForDirty(toSave)) {
        setDraft(next);
        setBaseline(snapshotForDirty(next));
        baselineEventRef.current = next;
      } else {
        setDraft((current) => ({
          ...current,
          changeLog: next.changeLog,
          updatedAt: next.updatedAt,
        }));
      }
      setSaveState("saved");
      return true;
    },
    [events, onSave],
  );

  useEffect(() => {
    if (!dirty || reasonModal) return;
    const timer = window.setTimeout(() => {
      persistDraft();
      window.setTimeout(() => {
        void reloadLabor();
      }, 600);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, reasonModal, persistDraft, reloadLabor]);

  const openFollowUp = () => {
    setReason("");
    setChangeAtLabel(formatDateTime(new Date().toISOString()));
    setReasonModal(true);
  };

  const confirmFollowUp = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Informe o motivo da atualização.");
      return;
    }
    persistDraft({ reason: trimmed, clientLabel });
    setReasonModal(false);
    setReason("");
    toast.success("Follow-up registrado.");
    window.setTimeout(() => {
      void reloadLabor();
    }, 600);
  };

  return (
    <PageShell
      width="wide"
      className="pb-28"
      back={
        <Link
          href="/eventos"
          className="inline-flex items-center gap-2 text-sm text-forest/60 hover:text-forest"
        >
          <ArrowLeft className="size-4" />
          Voltar ao calendário
        </Link>
      }
      eyebrow={draft.code}
      title={draft.title || "Evento sem nome"}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={draft.status} />
          {saveState === "saving" || dirty || saveState === "saved" ? (
            <span className={saveState === "saving" || dirty ? "text-forest/55" : undefined}>
              {saveState === "saving" ? "Salvando…" : dirty ? "Salvando em instantes…" : "Salvo"}
            </span>
          ) : null}
        </span>
      }
      actions={
        <>
          <FichaActionButtons
            saveState={saveState}
            pdfState={pdfState}
            onFollowUp={openFollowUp}
            onPdf={() => setPdfModal(true)}
          />
          <Button
            variant="destructive"
            size="icon"
            aria-label="Excluir relatório"
            onClick={() => {
              if (window.confirm("Excluir este relatório? A ação não pode ser desfeita neste aparelho.")) {
                onDelete(draft.id);
                toast.success("Relatório excluído.");
                router.push("/eventos");
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </>
      }
    >
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
              <SearchableSelect
                compact
                className="min-w-0 flex-1"
                value={draft.clientId ?? ""}
                onChange={(value) => update("clientId", value)}
                emptyLabel="Sem cliente vinculado"
                searchPlaceholder="Pesquisar cliente…"
                options={[
                  ...(clientMissing && draft.clientId
                    ? [{ value: draft.clientId, label: "Cliente removido da base" }]
                    : []),
                  ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.name })),
                ]}
              />
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
        </div>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
          <Field label="Local">
            <div className="flex gap-2">
              <SearchableSelect
                compact
                className="min-w-0 flex-1"
                value={draft.venueId ?? ""}
                onChange={(value) => {
                  const local = locais.find((item) => item.id === value) ?? null;
                  applyLocal(local);
                }}
                emptyLabel="Sem local vinculado"
                searchPlaceholder="Pesquisar local…"
                options={[
                  ...(localMissing && draft.venueId
                    ? [{ value: draft.venueId, label: "Local removido da base" }]
                    : []),
                  ...locais.map((local) => ({ value: local.id, label: local.name })),
                ]}
              />
              <Button
                type="button"
                variant="outline"
                className="h-8 shrink-0 px-2"
                onClick={() => setLocalModal(true)}
                aria-label="Cadastrar local"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {selectedLocal?.outOfTown ? <p className="meta-text mt-1">Fora da cidade</p> : null}
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
          <Field label="Local / endereço">
            <input
              className={fieldControlCompactClass}
              value={draft.venue.address}
              onChange={(event) =>
                update("venue", { ...draft.venue, address: event.target.value })
              }
            />
            {selectedLocal &&
            (selectedLocal.parkingNotes || selectedLocal.accessNotes || selectedLocal.loadingNotes) ? (
              <p className="meta-text mt-1">
                {[
                  selectedLocal.parkingNotes && `Estacionamento: ${selectedLocal.parkingNotes}`,
                  selectedLocal.accessNotes && `Acesso: ${selectedLocal.accessNotes}`,
                  selectedLocal.loadingNotes && `Carga: ${selectedLocal.loadingNotes}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </Field>
          <Field label="Fora da cidade">
            <label className="flex h-8 cursor-pointer items-center gap-2 text-sm text-forest">
              <input
                type="checkbox"
                className="size-4 accent-forest"
                checked={draft.outOfTown}
                onChange={(event) => update("outOfTown", event.target.checked)}
              />
              Ajuda de custo da equipe
            </label>
          </Field>
          <Field label="★ Adultos">
            <input
              type="number"
              min={0}
              className={cn(fieldControlCompactClass, "tabular")}
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
              className={cn(fieldControlCompactClass, "tabular")}
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
              className={cn(fieldControlCompactClass, "tabular")}
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
              className={cn(fieldControlCompactClass, "tabular")}
              value={draft.guests.professionals}
              onChange={(event) =>
                setGuests({
                  ...draft.guests,
                  professionals: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Horário do serviço">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.serviceTime}
              onChange={(event) => {
                const nextServiceTime = event.target.value;
                setDraft((current) => ({
                  ...current,
                  serviceTime: nextServiceTime,
                  foodDepartureTime: syncedFoodDepartureTime(
                    current.serviceTime,
                    nextServiceTime,
                    current.foodDepartureTime,
                  ),
                }));
              }}
            />
          </Field>
          <Field label="Horário de saída da comida">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.foodDepartureTime ?? ""}
              onChange={(event) => update("foodDepartureTime", event.target.value)}
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
          <Field label="Chegada da equipe">
            <input
              type="time"
              className={fieldControlCompactClass}
              value={draft.teamArrival}
              onChange={(event) => update("teamArrival", event.target.value)}
            />
          </Field>
        </div>
      </FichaSection>

      <FichaSection title="Equipe" compact>
        <p className="group-title mb-2">Casa</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STAFF_ROLES.map((role) => (
            <Field key={role.key} label={role.label}>
              <input
                type="number"
                min={0}
                className={cn(fieldControlCompactClass, "tabular")}
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
                    className={cn(fieldControlCompactClass, "tabular min-w-0 flex-1")}
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
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-forest/35 hover:text-danger"
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

        <p className="group-title mb-2 mt-6 border-t border-line pt-4">Externa</p>
        {(maoDeObra?.workers ?? []).length === 0 ? (
          <p className="meta-text">
            Cadastre os prestadores em Cadastros → Equipe Externa.
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

        <p className="group-title mb-2 mt-6 border-t border-line pt-4">Fardamento</p>
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

      <FichaSection
        title="Pratos do cardápio"
        actions={
          <>
            <Button
              size="sm"
              onClick={generatePerCapita}
              className={
                needsPerCapita
                  ? "bg-warn text-white hover:bg-warn/90 focus-visible:border-warn focus-visible:ring-warn/30"
                  : undefined
              }
            >
              Gerar Per Capita
            </Button>
            <Link
              href={`/logistica/separacao-materiais/${draft.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ClipboardList data-icon="inline-start" />
              Abrir separação de materiais
            </Link>
          </>
        }
      >
        {needsPerCapita ? (
          <p className="mb-4 rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
            Os pratos selecionados ainda não foram aplicados ao cardápio do evento. Clique em{" "}
            <strong>Gerar Per Capita</strong> para atualizar as quantidades.
          </p>
        ) : null}
        <CatalogDishPicker
          dishes={cadastros?.dishes ?? []}
          categoryOrder={cadastros?.dishCategories ?? []}
          selected={draft.selectedDishIds ?? []}
          popularity={dishPopularity}
          onChange={(ids) => {
            update("selectedDishIds", ids);
            if (menuPlanNeedsPerCapita(ids, cadastros?.dishes ?? [], eventMenuSections(draft))) {
              toast.warning("Clique em Gerar Per Capita para aplicar os pratos ao cardápio do evento.", {
                id: "gerar-per-capita",
              });
            } else {
              toast.dismiss("gerar-per-capita");
            }
          }}
        />
      </FichaSection>

      <FichaSection
        title="Cardápio do evento"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={addMenuSection}>
            <Plus data-icon="inline-start" />
            Nova seção
          </Button>
        }
      >
        {needsPerCapita ? (
          <p className="mb-4 rounded-lg border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
            Este cardápio está desatualizado em relação aos pratos selecionados. Clique em{" "}
            <strong>Gerar Per Capita</strong> na seção acima.
          </p>
        ) : null}
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

      <FichaSection title="Observações — cozinha">
        <Field label="Restrições alimentares" className="mb-4">
          <textarea
            className={cn(
              fieldControlClass,
              "min-h-24 border-warn/40 bg-warn-soft py-2",
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
          <p className="meta-text mb-2">
            Até {EVENT_ATTACHMENT_MAX_FILES} arquivos, 500 KB cada.
          </p>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="block w-full text-sm text-forest file:mr-3 file:h-9 file:rounded-md file:border file:border-line file:bg-white file:px-3 file:text-sm file:font-medium file:text-forest hover:file:bg-forest/[0.04]"
            onChange={(event) => {
              void addAttachments(event.target.files);
              event.target.value = "";
            }}
          />
          {(draft.attachments ?? []).length ? (
            <ul className="mt-3 space-y-2">
              {(draft.attachments ?? []).map((file) => (
                <AttachedMediaRow
                  key={file.id}
                  name={file.name}
                  dataUrl={file.dataUrl}
                  mime={file.mime}
                  onRemove={() =>
                    setDraft((current) => ({
                      ...current,
                      attachments: (current.attachments ?? []).filter((item) => item.id !== file.id),
                    }))
                  }
                />
              ))}
            </ul>
          ) : null}
        </Field>
      </FichaSection>


      <FichaSection title="Observações - Logística">
        <div className="grid gap-2.5 sm:grid-cols-2">
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
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Ilhas (estações)">
            <input
              type="number"
              min={0}
              className={cn(fieldControlClass, "tabular")}
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
          <div className="mt-4 rounded-md border border-line bg-cream/50 p-4">
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FlagField
            label="Material no dia anterior"
            checked={draft.logistics.materialPreviousDay === "sim"}
            onChange={(checked) => patchLogistics({ materialPreviousDay: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Mesa cavalete"
            checked={draft.logistics.trestleTable === "sim"}
            onChange={(checked) => patchLogistics({ trestleTable: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Recolher material ao final"
            checked={draft.logistics.mustCollectMaterial === "sim"}
            onChange={(checked) => patchLogistics({ mustCollectMaterial: checked ? "sim" : "nao" })}
          />
          <div className="space-y-2">
            <FlagField
              label="Conservação extra"
              checked={draft.logistics.extraConservation === "sim"}
              onChange={(checked) =>
                patchLogistics({
                  extraConservation: checked ? "sim" : "nao",
                  extraConservationQty: checked ? draft.logistics.extraConservationQty : "",
                })
              }
            />
            {draft.logistics.extraConservation === "sim" ? (
              <input
                className={fieldControlCompactClass}
                value={draft.logistics.extraConservationQty}
                onChange={(event) => patchLogistics({ extraConservationQty: event.target.value })}
                placeholder="Quantidade"
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <FlagField
              label="Gelo cubo"
              checked={draft.logistics.iceCubes === "sim"}
              onChange={(checked) =>
                patchLogistics({
                  iceCubes: checked ? "sim" : "nao",
                  iceCubesQty: checked ? draft.logistics.iceCubesQty : "",
                })
              }
            />
            {draft.logistics.iceCubes === "sim" ? (
              <input
                className={fieldControlCompactClass}
                value={draft.logistics.iceCubesQty}
                onChange={(event) => patchLogistics({ iceCubesQty: event.target.value })}
                placeholder="Quantidade"
              />
            ) : null}
          </div>
          <FlagField
            label="Local com cozinha"
            checked={draft.logistics.hasKitchen === "sim"}
            onChange={(checked) => patchLogistics({ hasKitchen: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Local com pia"
            checked={draft.logistics.hasSink === "sim"}
            onChange={(checked) => patchLogistics({ hasSink: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Local com geladeira"
            checked={draft.logistics.hasFridge === "sim"}
            onChange={(checked) => patchLogistics({ hasFridge: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Local com fogão"
            checked={draft.logistics.hasStove === "sim"}
            onChange={(checked) => patchLogistics({ hasStove: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Local com freezer"
            checked={draft.logistics.hasFreezer === "sim"}
            onChange={(checked) => patchLogistics({ hasFreezer: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Local com forno"
            checked={draft.logistics.hasOven === "sim"}
            onChange={(checked) => patchLogistics({ hasOven: checked ? "sim" : "nao" })}
          />
          <FlagField
            label="Local com micro-ondas"
            checked={draft.logistics.hasMicrowave === "sim"}
            onChange={(checked) => patchLogistics({ hasMicrowave: checked ? "sim" : "nao" })}
          />
          <Field label="Notas da equipe de logística" className="mt-1 sm:col-span-2 lg:col-span-3">
            <textarea
              className={cn(fieldControlClass, "min-h-24 py-2")}
              value={draft.logisticsNotes ?? ""}
              onChange={(event) => update("logisticsNotes", event.target.value)}
              placeholder="Materiais, local do evento e demais notas da logística."
            />
          </Field>
        </div>
      </FichaSection>
      <EventChangeHistory
        entries={draft.changeLog ?? []}
        clientNameById={new Map(clientes.map((cliente) => [cliente.id, cliente.name]))}
        localNameById={new Map(locais.map((local) => [local.id, local.name]))}
      />

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="Novo cliente" wide>
        <ClienteForm
          initial={null}
          onCancel={() => setClientModal(false)}
          onSubmit={(cliente) => {
            upsertCliente(cliente);
            update("clientId", cliente.id);
            setClientModal(false);
            toast.success("Cliente cadastrado e vinculado ao relatório.");
          }}
        />
      </Modal>

      <Modal open={localModal} onClose={() => setLocalModal(false)} title="Novo local" wide>
        <LocalForm
          initial={null}
          onCancel={() => setLocalModal(false)}
          onSubmit={(local) => {
            upsertLocal(local);
            applyLocal(local);
            setLocalModal(false);
            toast.success("Local cadastrado e vinculado ao relatório.");
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

      <Modal open={reasonModal} onClose={() => setReasonModal(false)} title="Novo follow-up">
        <div className="space-y-4">
          <p className="meta-text">
            Informe o motivo desta atualização. O relatório já salva sozinho; o follow-up fica no
            histórico.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-white px-3 py-2">
              <p className="field-label">Cliente</p>
              <p className="mt-1 text-sm text-forest">{clientLabel}</p>
            </div>
            <div className="rounded-md border border-line bg-white px-3 py-2">
              <p className="field-label">Data da alteração</p>
              <p className="tabular mt-1 text-sm text-forest">{changeAtLabel}</p>
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
            <Button type="button" variant="outline" onClick={() => setReasonModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmFollowUp}>
              Registrar follow-up
            </Button>
          </div>
        </div>
      </Modal>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end p-4 sm:p-5 lg:p-8">
        <div className="surface-card pointer-events-auto flex max-w-full flex-wrap items-center justify-end gap-2 bg-white/95 p-2 shadow-pop backdrop-blur">
          <Link
            href={`/logistica/separacao-materiais/${draft.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "px-3")}
          >
            <ClipboardList data-icon="inline-start" />
            Abrir separação de materiais
          </Link>
          <FichaActionButtons
            saveState={saveState}
            pdfState={pdfState}
            onFollowUp={openFollowUp}
            onPdf={() => setPdfModal(true)}
          />
        </div>
      </div>
    </PageShell>
  );
}

function FichaActionButtons({
  saveState,
  pdfState,
  onFollowUp,
  onPdf,
}: {
  saveState: "idle" | "saving" | "saved";
  pdfState: "idle" | "working";
  onFollowUp: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2">
      <Button className="px-4" disabled={saveState === "saving"} onClick={onFollowUp}>
        Novo follow-up
      </Button>
      <Button
        variant="outline"
        className="px-4"
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
            className={cn(fieldControlClass, "tabular disabled:bg-forest/[0.03]")}
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
          <div
            key={row.workerId}
            className="grid grid-cols-2 items-end gap-2 border-b border-line py-3 last:border-0 sm:grid-cols-[minmax(8rem,1.1fr)_minmax(9rem,1.3fr)_6rem_2rem]"
          >
            <div className="col-span-2 min-w-0 sm:col-span-1 sm:pb-1">
              <p className="truncate text-sm font-medium text-forest">{worker?.name || "Prestador removido"}</p>
              <p className="meta-text tabular text-xs">
                {formatBRL(amounts.total)}
                {amounts.allowance ? ` · ajuda ${formatBRL(amounts.allowance)}` : ""}
                {amounts.overtimeHours ? ` · ${amounts.overtimeHours}h extra` : ""}
              </p>
            </div>
            <Field label="Função">
              <SearchableSelect
                compact
                value={functionKey}
                onChange={(nextKey) => {
                  onChange(
                    allocations.map((item) =>
                      item.workerId === row.workerId
                        ? { ...item, functionKey: nextKey, daily: rateFor(rates, nextKey).daily }
                        : item,
                    ),
                  );
                }}
                searchPlaceholder="Pesquisar função…"
                options={LABOR_FUNCTIONS.map((role) => ({ value: role.key, label: role.label }))}
              />
            </Field>
            <Field label="Diária (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={cn(fieldControlCompactClass, "tabular text-right")}
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
            <button
              type="button"
              aria-label="Remover prestador"
              className="flex size-8 items-center justify-center justify-self-end text-forest/35 hover:text-danger"
              onClick={() => onChange(allocations.filter((item) => item.workerId !== row.workerId))}
            >
              <Trash2 className="size-4" />
            </button>
            <div className="col-span-2 space-y-1.5 sm:col-span-4">
              <span className="field-label">Fardamento</span>
              <div className="flex flex-wrap gap-1.5">
                {UNIFORM_PIECES.map((piece) => {
                  const selected = laborUniformPieces(row).includes(piece.key);
                  const size = worker?.uniformSizes?.[piece.key];
                  return (
                    <FilterChip
                      key={piece.key}
                      active={selected}
                      onClick={() => {
                        const current = laborUniformPieces(row);
                        const nextPieces = selected
                          ? current.filter((key) => key !== piece.key)
                          : [...current, piece.key];
                        onChange(
                          allocations.map((item) =>
                            item.workerId === row.workerId
                              ? {
                                  ...item,
                                  uniformPieces: nextPieces,
                                  uniformPiece: nextPieces[0] ?? "",
                                }
                              : item,
                          ),
                        );
                      }}
                    >
                      {piece.label}
                      {size ? ` · ${UNIFORM_SIZE_LABELS[size]}` : " · sem tamanho"}
                    </FilterChip>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      {available.length ? (
        <SearchableSelect
          value=""
          onChange={(workerId) => {
            const worker = workers.find((item) => item.id === workerId);
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
                uniformPieces: [],
                uniformPiece: "",
              },
            ]);
          }}
          emptyLabel="Selecionar prestador…"
          searchPlaceholder="Pesquisar prestador…"
          options={available.map((worker) => ({ value: worker.id, label: worker.name }))}
        />
      ) : allocations.length ? (
        <p className="meta-text">Todos os prestadores cadastrados já estão neste evento.</p>
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
  const available = PICKABLE_EXTRA_STAFF_ROLES.filter((role) => !used.has(role.key));
  return (
    <SearchablePicker
      label="Acrescentar função"
      searchPlaceholder="Pesquisar função…"
      options={available.map((role) => ({ value: role.key, label: role.label }))}
      onSelect={(key) => onAdd(key as ExtraStaffRoleKey)}
    />
  );
}

function EventChangeHistory({
  entries,
  clientNameById,
  localNameById,
}: {
  entries: EventRecord["changeLog"];
  clientNameById: Map<string, string>;
  localNameById: Map<string, string>;
}) {
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const pretty = (label: string, value: string) => {
    if (value === "(vazio)" || !value) return value;
    if (label === "Cliente") return clientNameById.get(value) ?? value;
    if (label === "Local") return localNameById.get(value) ?? value;
    return value;
  };
  const log = [...entries].sort((a, b) => compareDateSort(a.at, b.at, dateSort));

  return (
    <FichaSection
      title="Histórico de alterações"
      defaultOpen={false}
      actions={
        entries.length > 0 ? (
          <DateSortSelect value={dateSort} onChange={setDateSort} className="h-8" />
        ) : null
      }
    >
      {log.length === 0 ? (
        <p className="meta-text">
          Ainda não há alterações registradas neste relatório. As edições entram sozinhas; o
          follow-up guarda o motivo da atualização.
        </p>
      ) : (
        <ol className="space-y-4">
          {log.map((entry) => (
            <li key={entry.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
              <p className="text-sm text-forest">
                <span className="font-medium">{entry.userName}</span>
                <span className="tabular text-forest/50"> · {formatDateTime(entry.at)}</span>
              </p>
              {entry.clientLabel || entry.reason ? (
                <p className="meta-text mt-1">
                  {entry.clientLabel ? `Cliente: ${entry.clientLabel}` : null}
                  {entry.clientLabel && entry.reason ? " · " : null}
                  {entry.reason ? `Motivo: ${entry.reason}` : null}
                </p>
              ) : null}
              <ul className="mt-2 space-y-1 text-sm text-forest/70">
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
  const [focused, setFocused] = useState(false);
  if (dishes.length === 0) {
    return (
      <p className="meta-text rounded-md border border-dashed border-line p-4">
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

  const popular = !query && focused
    ? [...dishes]
        .sort(byPopularity)
        .filter((dish) => !selectedSet.has(dish.id) && (popularity.get(dish.id) ?? 0) > 0)
        .slice(0, 12)
    : [];

  return (
    <div className="space-y-4">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar prato…"
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 180)}
      />
      {popular.length > 0 ? (
        <div>
          <p className="group-title mb-2">Mais pedidos</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((dish) => (
              <DishChoice
                key={`pop-${dish.id}`}
                dish={dish}
                checked={selectedSet.has(dish.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      ) : null}
      {selectedDishes.length > 0 ? (
        <div className="space-y-3">
          <p className="group-title">Selecionados</p>
          {groupsFor(selectedDishes).map((group) => (
            <DishGroup
              key={`sel-${group.category}`}
              group={group}
              selectedSet={selectedSet}
              onToggle={toggle}
            />
          ))}
        </div>
      ) : (
        <p className="meta-text">Nenhum prato selecionado. Use a busca para incluir.</p>
      )}
      {query ? (
        searchHits.length === 0 ? (
          <p className="meta-text rounded-md border border-dashed border-line p-4">
            Nenhum prato encontrado para “{search.trim()}”.
          </p>
        ) : (
          <div className="space-y-3">
            {topHits.length > 0 ? (
              <div>
                <p className="group-title mb-2">Mais usados no cardápio</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {topHits.slice(0, 8).map((dish) => (
                    <DishChoice
                      key={`pop-${dish.id}`}
                      dish={dish}
                      checked={selectedSet.has(dish.id)}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {topHits.length === 0 || otherHits.length > 0 ? (
              <>
                <p className="group-title">Resultados</p>
                {groupsFor(topHits.length ? otherHits : searchHits).map((group) => (
                  <DishGroup
                    key={`hit-${group.category}`}
                    group={group}
                    selectedSet={selectedSet}
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
  onToggle,
}: {
  group: { category: string; items: DishRecord[] };
  selectedSet: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="group-title mb-2">{group.category}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.items.map((dish) => (
          <DishChoice
            key={dish.id}
            dish={dish}
            checked={selectedSet.has(dish.id)}
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
  onToggle,
}: {
  dish: DishRecord;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
        checked ? "border-forest/30 bg-forest/[0.06]" : "border-line hover:bg-forest/[0.03]",
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-forest"
        checked={checked}
        onChange={() => onToggle(dish.id)}
      />
      <span className="min-w-0 flex-1 text-forest">{dish.name}</span>
    </label>
  );
}

function FlagField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-forest">
      <input
        type="checkbox"
        className="size-4 accent-forest"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
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
  const readDrag = (transfer: DataTransfer) => {
    const [section, item] = transfer.getData("text/plain").split(":").map(Number);
    if (!Number.isInteger(section) || !Number.isInteger(item)) return null;
    return { section, item };
  };

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

  const relocate = (fromSection: number, fromIndex: number, toSection: number, toIndex: number) => {
    if (fromSection === toSection && fromIndex === toIndex) return;
    const next = sections.map((section) => ({ ...section, items: [...section.items] }));
    const [moved] = next[fromSection].items.splice(fromIndex, 1);
    if (!moved) return;
    let index = toIndex;
    if (fromSection === toSection && fromIndex < toIndex) index -= 1;
    next[toSection].items.splice(Math.max(0, Math.min(index, next[toSection].items.length)), 0, moved);
    onChange(next);
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

  const addItem = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    patchSection(sectionIndex, { items: [...section.items, menuItem()] });
  };

  const duplicateItem = (sectionIndex: number, itemIndex: number) => {
    const section = sections[sectionIndex];
    const item = section.items[itemIndex];
    if (!item) return;
    const items = [...section.items];
    items.splice(itemIndex + 1, 0, { ...item, id: uid() });
    patchSection(sectionIndex, { items });
  };

  if (sections.length === 0) {
    return (
      <p className="meta-text rounded-md border border-dashed border-line p-4">
        Nenhum prato neste cardápio. Selecione no catálogo e clique em Gerar Per Capita, ou crie uma seção para organizar.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
          <div className="mb-2 flex items-center gap-1.5">
            <input
              className={cn(fieldControlCompactClass, "min-w-0 flex-1")}
              value={section.title}
              placeholder="Seção"
              onChange={(event) => patchSection(sectionIndex, { title: event.target.value })}
            />
            <input
              type="time"
              aria-label="Horário da seção"
              className={cn(fieldControlCompactClass, "tabular w-24 shrink-0 sm:w-28")}
              value={section.time}
              onChange={(event) => patchSection(sectionIndex, { time: event.target.value })}
            />
            <button
              type="button"
              aria-label="Subir seção"
              className="flex size-8 shrink-0 items-center justify-center text-forest/35 hover:text-forest disabled:opacity-30"
              disabled={sectionIndex === 0}
              onClick={() => moveSection(sectionIndex, -1)}
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Descer seção"
              className="flex size-8 shrink-0 items-center justify-center text-forest/35 hover:text-forest disabled:opacity-30"
              disabled={sectionIndex === sections.length - 1}
              onClick={() => moveSection(sectionIndex, 1)}
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Excluir seção"
              className="flex size-8 shrink-0 items-center justify-center text-forest/35 hover:text-danger"
              onClick={() => removeSection(sectionIndex)}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th className="field-label w-28 px-1 pb-1 font-normal">Per capita</th>
                  <th className="field-label px-1 pb-1 font-normal">Prato</th>
                  <th className="field-label px-1 pb-1 font-normal">Observações</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = readDrag(event.dataTransfer);
                  if (!from) return;
                  relocate(from.section, from.item, sectionIndex, section.items.length);
                }}
              >
                {section.items.map((item, itemIndex) => (
                  <tr
                    key={item.id}
                    className="border-t border-line"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const from = readDrag(event.dataTransfer);
                      if (!from) return;
                      relocate(from.section, from.item, sectionIndex, itemIndex);
                    }}
                  >
                    <td className="py-1 pr-1">
                      <button
                        type="button"
                        draggable
                        aria-label="Arrastar prato"
                        className="flex size-7 cursor-grab items-center justify-center text-forest/30 hover:text-forest active:cursor-grabbing"
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", `${sectionIndex}:${itemIndex}`);
                        }}
                      >
                        <GripVertical className="size-3.5" />
                      </button>
                    </td>
                    <td className="p-1">
                      <input
                        className={cn(fieldControlCompactClass, "tabular text-right")}
                        value={item.quantity}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[itemIndex] = { ...item, quantity: event.target.value };
                          patchSection(sectionIndex, { items });
                        }}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        className={fieldControlCompactClass}
                        value={item.name}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[itemIndex] = { ...item, name: event.target.value };
                          patchSection(sectionIndex, { items });
                        }}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        className={fieldControlCompactClass}
                        value={item.notes}
                        onChange={(event) => {
                          const items = [...section.items];
                          items[itemIndex] = { ...item, notes: event.target.value };
                          patchSection(sectionIndex, { items });
                        }}
                      />
                    </td>
                    <td className="p-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateItem(sectionIndex, itemIndex)}
                          className="flex size-7 items-center justify-center text-forest/35 transition-colors hover:text-forest"
                          aria-label="Duplicar prato"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchSection(sectionIndex, {
                              items: section.items.filter((row) => row.id !== item.id),
                            })
                          }
                          className="flex size-7 items-center justify-center text-forest/35 transition-colors hover:text-danger"
                          aria-label="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="mt-2 text-[13px] font-medium text-forest/55 hover:text-forest"
            onClick={() => addItem(sectionIndex)}
          >
            + Adicionar prato
          </button>
        </div>
      ))}
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
