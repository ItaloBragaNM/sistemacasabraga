"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { DateSortSelect, compareDateSort } from "@/components/date-sort";
import { useEvents } from "@/components/events/events-provider";
import { StatusBadge } from "@/components/events/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { formatShortDate } from "@/lib/dates";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { guestTotal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FichaIndex() {
  const { events, ready } = useEvents();
  const { data: cadastros } = useCadastros();
  const [dateSort, setDateSort] = useState<"asc" | "desc">("asc");
  const clientNames = new Map((cadastros?.clientes ?? []).map((cliente) => [cliente.id, cliente.name]));
  const sorted = [...events].sort((a, b) =>
    compareDateSort(`${a.date}${a.invitationTime}`, `${b.date}${b.invitationTime}`, dateSort),
  );

  return (
    <PageShell
      eyebrow="Eventos"
      title="Relatório do Evento"
      actions={
        <>
          <DateSortSelect value={dateSort} onChange={setDateSort} />
          <Link href="/eventos/novo" className={cn(buttonVariants(), "px-4")}>
            <Plus data-icon="inline-start" />
            Novo relatório
          </Link>
        </>
      }
    >
      {!ready ? (
        <LoadingBlock label="Carregando relatórios…" />
      ) : sorted.length === 0 ? (
        <EmptyBlock
          title="Nenhum relatório ainda"
          description="Crie o primeiro evento da casa para começar a operação."
        />
      ) : (
        <Card flush>
          {sorted.map((event, index) => (
            <Link
              key={event.id}
              href={`/eventos/${event.id}`}
              className={cn(
                "grid gap-2 px-4 py-3 transition-colors hover:bg-cream md:grid-cols-[110px_minmax(0,1fr)_auto] md:items-center md:gap-4",
                index > 0 && "border-t border-line",
              )}
            >
              <p className="tabular text-sm text-forest/60">{formatShortDate(event.date)}</p>
              <div className="min-w-0">
                <p className="section-title">{event.title}</p>
                <p className="meta-text mt-1">
                  {event.code} · {EVENT_TYPE_LABELS[event.type]}
                  {event.clientId && clientNames.get(event.clientId)
                    ? ` · ${clientNames.get(event.clientId)}`
                    : ""}{" "}
                  · {event.venue.name} · {guestTotal(event.guests)} pessoas
                </p>
              </div>
              <div>
                <StatusBadge status={event.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </PageShell>
  );
}
