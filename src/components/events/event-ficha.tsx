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
import { menuItem } from "@/lib/event-factory";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, UNIFORM_SIZE_LABELS, VENUE_KIND_LABELS } from "@/lib/labels";
import { formatBRL } from "@/lib/money";
import {
  DRINK_ITEMS,
  EVENT_STATUSES,
  EVENT_TYPES,
  guestTotal,
  MENU_SECTIONS,
  STAFF_ROLES,
  UNIFORM_PIECES,
  UNIFORM_SIZES,
  type EventRecord,
  type MenuSectionKey,
  type VenueKind,
  type YesNo,
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
                  : "Ficha operacional — uso interno"}
            </span>
          </div>
          <h1 className="font-display mt-2 text-4xl tracking-tight text-forest sm:text-5xl">
            {draft.title || "Evento sem nome"}
          </h1>
          <p className="mt-2 text-sm font-light text-forest/60">
            {draft.date ? `${formatWeekday(draft.date)}, ${formatLongDate(draft.date)}` : "Data a definir"}
            {draft.invitationTime ? ` · convite ${draft.invitationTime}` : ""}
            {draft.serviceTime ? ` · serviço ${draft.serviceTime}` : ""}
            {` · ${guestTotal(draft.guests)} a servir`}
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
          title="Dados do evento"
          hint="Campos com estrela são os obrigatórios da ficha da casa."
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
          <Field label="Dt. entrega comida">
            <input
              type="date"
              className={fieldControlClass}
              value={draft.foodDeliveryDate}
              onChange={(event) => update("foodDeliveryDate", event.target.value)}
            />
          </Field>
          <Field label="Per capita (R$)">
            <input
              type="number"
              min={0}
              className={fieldControlClass}
              value={draft.perCapita || ""}
              onChange={(event) => update("perCapita", Number(event.target.value))}
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
        {draft.perCapita > 0 && (
          <p className="mt-4 text-sm font-light text-forest/55">
            Per capita {formatBRL(draft.perCapita)} · {guestTotal(draft.guests)} a servir
            {draft.guests.adults
              ? ` · referência ${formatBRL(draft.perCapita * draft.guests.adults)} nos adultos`
              : ""}
          </p>
        )}
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
                update("guests", { ...draft.guests, children: Number(event.target.value) })
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
                update("guests", {
                  ...draft.guests,
                  professionals: Number(event.target.value),
                })
              }
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
        <SectionTitle title="Equipe" hint="Quantidade por função, como na planilha da casa." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle
          title="Cardápio do evento"
          hint="Categoria, quantidade, prato/variação e observação — a base da lista de materiais."
        />
        <div className="space-y-7">
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
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Bebidas" hint="Quantidade e unidade de cada item da casa." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DRINK_ITEMS.map((drink) => (
            <Field key={drink.key} label={`${drink.label} · qtd/unid`}>
              <input
                className={fieldControlClass}
                value={draft.drinks[drink.key]}
                onChange={(event) =>
                  update("drinks", {
                    ...draft.drinks,
                    [drink.key]: event.target.value,
                  } as EventRecord["drinks"])
                }
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Fardamentos" hint="Dólmã, bata e avental por tamanho." />
        <div className="grid gap-6 md:grid-cols-3">
          {UNIFORM_PIECES.map((piece) => (
            <div key={piece.key} className="rounded-xl border border-forest/10 p-4">
              <p className="font-section mb-3 text-[0.7rem] text-forest">{piece.label}</p>
              <div className="grid grid-cols-4 gap-2">
                {UNIFORM_SIZES.map((size) => (
                  <Field key={size} label={UNIFORM_SIZE_LABELS[size]}>
                    <input
                      type="number"
                      min={0}
                      className={fieldControlClass}
                      value={draft.uniforms[piece.key][size]}
                      onChange={(event) =>
                        update("uniforms", {
                          ...draft.uniforms,
                          [piece.key]: {
                            ...draft.uniforms[piece.key],
                            [size]: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

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
            label="Menu volante?"
            value={draft.logistics.flyingMenu}
            onChange={(value) =>
              update("logistics", { ...draft.logistics, flyingMenu: value })
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
          <Field label="Restrições alimentares" className="md:col-span-2 xl:col-span-3">
            <textarea
              className={cn(
                fieldControlClass,
                "min-h-24 border-terracotta/30 bg-terracotta/5 py-2",
              )}
              value={draft.dietaryNotes}
              onChange={(event) => update("dietaryNotes", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
        <SectionTitle title="Observações cardápio e montagem" />
        <textarea
          className={cn(fieldControlClass, "min-h-36 py-3")}
          value={draft.menuSetupNotes}
          onChange={(event) => update("menuSetupNotes", event.target.value)}
        />
      </section>
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
      <h3 className="font-section mb-3 text-[0.7rem] text-forest/55">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr>
              <th className="field-label w-28 px-2 pb-2 font-normal">Qtd</th>
              <th className="field-label px-2 pb-2 font-normal">Prato / variação</th>
              <th className="field-label px-2 pb-2 font-normal">Obs / variação</th>
              <th />
            </tr>
          </thead>
          <tbody className="font-list">
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
      <Button
        variant="outline"
        className="mt-3"
        onClick={() => onChange([...items, menuItem()])}
      >
        <Plus data-icon="inline-start" />
        Adicionar {title.toLowerCase()}
      </Button>
    </div>
  );
}
