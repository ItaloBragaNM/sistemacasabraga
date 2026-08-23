"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { Button } from "@/components/ui/button";
import { formatLongDate, formatWeekday } from "@/lib/dates";
import { EVENT_TYPE_LABELS, SERVICE_STYLE_LABELS } from "@/lib/labels";
import { guestTotal, MENU_SECTIONS, type EventRecord } from "@/lib/types";

export function KitchenSheet({ event }: { event: EventRecord }) {
  const kitchenStaff = event.staff.filter((member) =>
    /chef|cozin|confeit|aux/i.test(`${member.role} ${member.name}`),
  );

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
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="h-10"
          >
            Imprimir
          </Button>
          <Button
            className="h-10 bg-terracotta text-cream hover:bg-terracotta/90"
            onClick={async () => {
              await downloadKitchenPdf(event);
              toast.success("PDF da cozinha gerado.");
            }}
          >
            <Download data-icon="inline-start" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <article className="kitchen-sheet mx-auto w-full max-w-[210mm] bg-[#FFFBFA] p-8 shadow-xl print:max-w-none print:shadow-none">
        <header className="bg-petrol px-6 py-5 text-cream">
          <p className="font-section text-[0.62rem] tracking-[0.22em] text-cream/70">
            Casa Braga · Ficha de Cozinha
          </p>
          <h1 className="font-display mt-2 text-4xl">{event.title}</h1>
          <p className="mt-2 text-sm font-light text-cream/75">
            {event.code} · {EVENT_TYPE_LABELS[event.type]} ·{" "}
            {SERVICE_STYLE_LABELS[event.serviceStyle]}
          </p>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Info label="Data" value={`${formatWeekday(event.date)}, ${formatLongDate(event.date)}`} />
          <Info label="Serviço" value={`${event.startTime} – ${event.endTime}`} />
          <Info label="Pax" value={`${guestTotal(event.guests)}`} />
          <Info label="Local" value={event.venue.name} />
          <Info
            label="Montagem / desmontagem"
            value={`${event.assemblyTime} / ${event.teardownTime}`}
          />
          <Info
            label="Público"
            value={`${event.guests.adults} adultos · ${event.guests.children} crianças`}
          />
        </div>

        {event.menu.dietaryNotes && (
          <div className="mt-5 border border-terracotta bg-[#F8D9D7] px-4 py-3">
            <p className="font-section text-[0.62rem] text-terracotta">
              Restrições e alergias
            </p>
            <p className="mt-1 text-sm leading-6">{event.menu.dietaryNotes}</p>
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
                  <li key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 text-sm">
                    <span>{item.name}</span>
                    <span className="text-forest/70">{item.quantity}</span>
                    <span className="text-right text-forest/50">{item.notes}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {event.timeline.length > 0 && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Cronograma de serviço
            </h2>
            <ul className="font-list divide-y divide-forest/8 text-sm">
              {event.timeline.map((item) => (
                <li key={item.id} className="grid grid-cols-[72px_1fr_auto] gap-4 py-2">
                  <span className="font-medium">{item.time}</span>
                  <span>{item.activity}</span>
                  <span className="text-forest/50">{item.owner}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {kitchenStaff.length > 0 && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Equipe de cozinha
            </h2>
            <ul className="font-list divide-y divide-forest/8 text-sm">
              {kitchenStaff.map((item) => (
                <li key={item.id} className="flex justify-between py-2">
                  <span>
                    {item.quantity}× {item.role}
                    {item.name ? ` — ${item.name}` : ""}
                  </span>
                  <span className="text-forest/50">{item.shift}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {event.menu.kitchenNotes && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Observações da cozinha
            </h2>
            <p className="text-sm leading-6">{event.menu.kitchenNotes}</p>
          </section>
        )}

        {event.attentionPoints && (
          <section className="mt-6">
            <h2 className="font-section mb-2 border-b border-forest/15 pb-1 text-[0.7rem]">
              Pontos de atenção
            </h2>
            <p className="text-sm leading-6">{event.attentionPoints}</p>
          </section>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-forest/10 pt-3 text-xs text-forest/50">
          <p>
            Operação: {event.operationalOwner || "—"} · Comercial:{" "}
            {event.commercialOwner || "—"}
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
