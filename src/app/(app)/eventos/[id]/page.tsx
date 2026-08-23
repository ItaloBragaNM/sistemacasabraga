"use client";

import { useParams } from "next/navigation";
import { EventFicha } from "@/components/events/event-ficha";
import { useEvents } from "@/components/events/events-provider";

export default function EventoPage() {
  const params = useParams<{ id: string }>();
  const { ready, getEvent, upsert, remove } = useEvents();
  const event = getEvent(params.id);

  if (!ready) {
    return (
      <p className="py-20 text-center text-sm font-light text-forest/50">
        Abrindo a ficha…
      </p>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-4xl text-forest">Ficha não encontrada</h1>
        <p className="mt-2 text-sm font-light text-forest/55">
          Este evento pode ter sido excluído neste aparelho.
        </p>
      </div>
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
