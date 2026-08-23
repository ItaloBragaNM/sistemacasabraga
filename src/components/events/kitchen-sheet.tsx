"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { Button } from "@/components/ui/button";
import { formatLongDate, formatWeekday } from "@/lib/dates";
import { EVENT_TYPE_LABELS, UNIFORM_SIZE_LABELS } from "@/lib/labels";
import {
  DRINK_ITEMS,
  guestTotal,
  MENU_SECTIONS,
  STAFF_ROLES,
  UNIFORM_PIECES,
  UNIFORM_SIZES,
  type EventRecord,
} from "@/lib/types";

export function KitchenSheet({ event }: { event: EventRecord }) {
  const drinks = DRINK_ITEMS.filter((item) => event.drinks[item.key].trim());
  const staff = STAFF_ROLES.filter((role) => event.staff[role.key] > 0);

  return (
    <div className="min-h-screen bg-[#e8e2da] px-3 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between print:hidden">
        <Link
          href={`/eventos/${event.id}`}
          className="inline-flex items-center gap-2 text-sm text-forest/70"
        >
          <ArrowLeft className="size-4" />
          Voltar à ficha
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="h-10">
            Imprimir
          </Button>
          <Button
            className="h-10 bg-terracotta text-cream hover:bg-terracotta/90"
            onClick={async () => {
              try {
                await downloadKitchenPdf(event);
                toast.success("PDF da cozinha baixado.");
              } catch (error) {
                console.error(error);
                toast.error("Não foi possível gerar o PDF. Use Imprimir nesta página.");
              }
            }}
          >
            <Download data-icon="inline-start" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto w-full max-w-[210mm] bg-[#FFFBFA] p-8 shadow-xl print:max-w-none print:shadow-none">
        <header className="bg-petrol px-6 py-5 text-cream">
          <p className="font-section text-[0.62rem] tracking-[0.22em] text-cream/70">
            Casa Braga · Ficha de Cozinha
          </p>
          <h1 className="font-display mt-2 text-4xl">{event.title}</h1>
          <p className="mt-2 text-sm font-light text-cream/75">
            {event.code} · {EVENT_TYPE_LABELS[event.type]}
          </p>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Info
            label="Data"
            value={event.date ? `${formatWeekday(event.date)}, ${formatLongDate(event.date)}` : "—"}
          />
          <Info
            label="Convite / serviço"
            value={`${event.invitationTime || "—"} / ${event.serviceTime || "—"}`}
          />
          <Info label="A servir" value={`${guestTotal(event.guests)}`} />
          <Info label="Local" value={event.venue.address || event.venue.name} />
          <Info label="Chegada equipe" value={event.teamArrival || "—"} />
          <Info
            label="Público"
            value={`${event.guests.adults} ad · ${event.guests.children} cr · ${event.guests.professionals} prof`}
          />
        </div>

        {event.dietaryNotes && (
          <div className="mt-5 border border-terracotta bg-[#F8D9D7] px-4 py-3">
            <p className="font-section text-[0.62rem] text-terracotta">
              Restrições alimentares
            </p>
            <p className="mt-1 text-sm leading-6">{event.dietaryNotes}</p>
          </div>
        )}

        {MENU_SECTIONS.map((section) => {
          const items = event.menu[section.key].filter((item) => item.name.trim());
          if (!items.length) return null;
          return (
            <section key={section.key} className="mt-6">
              <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem] text-forest">
                {section.label}
              </h2>
              <ul className="font-list divide-y divide-forest/8">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="text-forest/70">{item.quantity}</span>
                    <span className="text-right text-forest/50">{item.notes}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {drinks.length > 0 && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Bebidas
            </h2>
            <ul className="font-list grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-5">
              {drinks.map((item) => (
                <li key={item.key} className="flex justify-between border-b border-forest/8 py-2">
                  <span>{item.label}</span>
                  <span className="text-forest/60">{event.drinks[item.key]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {staff.length > 0 && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Equipe
            </h2>
            <ul className="font-list grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              {staff.map((item) => (
                <li key={item.key} className="flex justify-between border-b border-forest/8 py-2">
                  <span>{item.label}</span>
                  <span>{event.staff[item.key]}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
            Fardamentos
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {UNIFORM_PIECES.map((piece) => (
              <div key={piece.key} className="border border-forest/10 px-3 py-2 text-sm">
                <p className="field-label">{piece.label}</p>
                <p className="font-list mt-1">
                  {UNIFORM_SIZES.map(
                    (size) => `${UNIFORM_SIZE_LABELS[size]} ${event.uniforms[piece.key][size]}`,
                  ).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        {event.logistics.alcohol && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Álcool
            </h2>
            <p className="text-sm leading-6">{event.logistics.alcohol}</p>
          </section>
        )}

        {event.menuSetupNotes && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Observações cardápio e montagem
            </h2>
            <p className="text-sm leading-6">{event.menuSetupNotes}</p>
          </section>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-forest/10 pt-3 text-xs text-forest/50">
          <p>
            Material dia anterior: {flag(event.logistics.materialPreviousDay)} · Cavalete:{" "}
            {flag(event.logistics.trestleTable)}
          </p>
          <p>Casa Braga</p>
        </footer>
      </article>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-forest/10 px-3 py-2">
      <p className="field-label">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function flag(value: string) {
  if (value === "sim") return "Sim";
  if (value === "nao") return "Não";
  return "—";
}
