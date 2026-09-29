"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { EventFicha } from "@/components/events/event-ficha";
import { useEvents } from "@/components/events/events-provider";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

export default function EventoPage() {
  const params = useParams<{ id: string }>();
  const { ready, getEvent, upsert, remove } = useEvents();
  const event = getEvent(params.id);

  if (!ready) {
    return <LoadingBlock label="Abrindo a ficha…" />;
  }

  if (!event) {
    return (
      <PageShell title="Ficha do Evento">
        <EmptyBlock
          title="Ficha não encontrada"
          description="Este evento pode ter sido excluído."
          action={
            <Link href="/eventos" className={buttonVariants({ variant: "outline" })}>
              Voltar ao calendário
            </Link>
          }
        />
      </PageShell>
    );
  }

  return (
    <EventFicha
      key={event.id}
      event={event}
      onSave={upsert}
      onDelete={remove}
    />
  );
}
