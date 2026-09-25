"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadKitchenPdf } from "@/components/events/kitchen-pdf";
import { Button } from "@/components/ui/button";
import { formatLongDate, formatWeekday } from "@/lib/dates";
import { EVENT_TYPE_LABELS, UNIFORM_SIZE_LABELS } from "@/lib/labels";
import {
  alcoholSummary,
  eventMenuSections,
  eventStaffLines,
  formatUniformSizeLine,
  guestTotal,
  guestsSummary,
  uniformPiecesForReport,
  type EventRecord,
} from "@/lib/types";

export function KitchenSheet({ event }: { event: EventRecord }) {
  const staff = eventStaffLines(event);
  const uniforms = uniformPiecesForReport(event.uniforms);

  return (
    <div className="min-h-screen bg-cream px-3 py-6 print:bg-white print:p-0">
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

      <article className="kitchen-print-sheet mx-auto w-full max-w-[210mm] bg-white print:max-w-none">
        <header className="kitchen-print-header bg-petrol px-6 py-5 text-cream">
          <p className="text-[13px] font-medium text-cream/70">
            Casa Braga · Ficha de Cozinha
          </p>
          <h1 className="mt-2 text-[22px] font-semibold leading-tight">{event.title}</h1>
          <p className="mt-2 text-sm font-light text-cream/75">
            {event.code} · {EVENT_TYPE_LABELS[event.type]}
          </p>
          <p className="mt-2 text-sm font-light text-cream/80">
            {event.date
              ? `${formatWeekday(event.date)}, ${formatLongDate(event.date)}`
              : "Data a definir"}
          </p>
          <p className="mt-1 text-sm font-light text-cream/80">
            {event.venue.address?.trim() || event.venue.name || "Local a definir"}
          </p>
        </header>
        <div className="p-8 pt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Info
            label="Data"
            value={event.date ? `${formatWeekday(event.date)}, ${formatLongDate(event.date)}` : "—"}
          />
          <Info
            label="Cerimônia / convite / serviço"
            value={`${event.ceremonyTime || "—"} / ${event.invitationTime || "—"} / ${event.serviceTime || "—"}${event.serviceDuration ? ` · ${event.serviceDuration}` : ""}`}
          />
          <Info label="A servir" value={`${guestTotal(event.guests)}`} />
          <Info label="Local" value={event.venue.address || event.venue.name} />
          <Info label="Chegada da equipe" value={event.teamArrival || "—"} />
          <Info
            label="Público"
            value={guestsSummary(event.guests)}
          />
        </div>

        {event.dietaryNotes && (
          <div className="mt-5 border border-terracotta bg-[#F8D9D7] px-4 py-3">
            <p className="text-[13px] font-medium text-forest/50">
              Restrições alimentares
            </p>
            <p className="mt-1 text-sm leading-6">{event.dietaryNotes}</p>
          </div>
        )}

        {eventMenuSections(event).map((section) => {
          const items = section.items.filter((item) => item.name.trim());
          if (!items.length) return null;
          return (
            <section key={section.id} className="mt-6">
              <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold text-forest">
                {section.time ? `${section.title} · ${section.time}` : section.title}
              </h2>
              <ul className="divide-y divide-forest/8">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[5.5rem_1fr_auto] gap-4 py-2 text-sm"
                  >
                    <span className="text-forest/70">{item.quantity}</span>
                    <span>{item.name}</span>
                    <span className="text-right text-forest/50">{item.notes}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {staff.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold">
              Equipe
            </h2>
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              {staff.map((item) => (
                <li key={item.key} className="flex justify-between border-b border-forest/8 py-2">
                  <span>{item.label}</span>
                  <span>{item.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {uniforms.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold">
              Fardamentos
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {uniforms.map((piece) => (
                <div key={piece.key} className="border border-forest/10 px-3 py-2 text-sm">
                  <p className="field-label">{piece.label}</p>
                  <p className="mt-1">
                    {formatUniformSizeLine(piece.sizes, UNIFORM_SIZE_LABELS)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {alcoholSummary(event.logistics) ? (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold">
              Bebidas alcoólicas
            </h2>
            <p className="text-sm leading-6">{alcoholSummary(event.logistics)}</p>
          </section>
        ) : null}

        {event.menuSetupNotes && (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold">
              Observações — cozinha
            </h2>
            <p className="text-sm leading-6">{event.menuSetupNotes}</p>
          </section>
        )}

        {event.managementNotes ? (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold">
              Gerenciais e Evento
            </h2>
            <p className="text-sm leading-6">{event.managementNotes}</p>
          </section>
        ) : null}

        {event.logisticsNotes && (
          <section className="mt-6">
            <h2 className="mb-2 border-b border-forest/15 pb-1 text-[13px] font-semibold">
              Observações — logística
            </h2>
            <p className="text-sm leading-6">{event.logisticsNotes}</p>
          </section>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-forest/10 pt-3 text-xs text-forest/50">
          <p>
            Material dia anterior: {flag(event.logistics.materialPreviousDay)} · Cavalete:{" "}
            {flag(event.logistics.trestleTable)}
          </p>
          <p>Casa Braga</p>
        </footer>
        </div>
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
