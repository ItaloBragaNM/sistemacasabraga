"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { useEvents } from "@/components/events/events-provider";
import { StatusBadge } from "@/components/events/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatShortDate } from "@/lib/dates";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { guestTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FichaIndex() {
  const { events, ready } = useEvents();
  const { data: cadastros } = useCadastros();
  const clientNames = new Map((cadastros?.clientes ?? []).map((cliente) => [cliente.id, cliente.name]));
  const sorted = [...events].sort((a, b) =>
    `${a.date}${a.invitationTime}`.localeCompare(`${b.date}${b.invitationTime}`),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-section text-[0.68rem] text-terracotta">Eventos</p>
          <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">
            Ficha do Evento
          </h1>
          <p className="mt-2 max-w-xl text-sm font-light leading-6 text-forest/65">
            A ficha da casa: dados do evento, convidados, horários, equipe,
            cardápio, bebidas, fardamentos e logística.
          </p>
        </div>
        <Link
          href="/eventos/novo"
          className={cn(buttonVariants(), "h-10 bg-forest px-4 text-cream hover:bg-petrol")}
        >
          <Plus data-icon="inline-start" />
          Nova ficha
        </Link>
      </div>

      {!ready ? (
        <p className="text-sm font-light text-forest/50">Carregando fichas…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-forest/20 px-6 py-16 text-center">
          <p className="font-display text-3xl">Nenhuma ficha ainda</p>
          <p className="mt-2 text-sm font-light text-forest/55">
            Crie o primeiro evento da casa para começar a operação.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
          {sorted.map((event, index) => (
            <Link
              key={event.id}
              href={`/eventos/${event.id}`}
              className={cn(
                "grid gap-3 px-5 py-4 transition-colors hover:bg-cream md:grid-cols-[110px_1fr_auto] md:items-center",
                index > 0 && "border-t border-forest/8",
              )}
            >
              <p className="font-list text-sm text-forest/60">{formatShortDate(event.date)}</p>
              <div>
                <p className="font-display text-2xl text-forest">{event.title}</p>
                <p className="font-list mt-1 text-sm text-forest/55">
                  {event.code} · {EVENT_TYPE_LABELS[event.type]}
                  {event.clientId && clientNames.get(event.clientId)
                    ? ` · ${clientNames.get(event.clientId)}`
                    : ""}{" "}
                  · {event.venue.name} · {guestTotal(event.guests)} pax
                </p>
              </div>
              <StatusBadge status={event.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
