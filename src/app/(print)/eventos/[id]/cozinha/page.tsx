"use client";

import { useParams } from "next/navigation";
import { KitchenSheet } from "@/components/events/kitchen-sheet";
import { useEvents } from "@/components/events/events-provider";

export default function CozinhaPage() {
  const params = useParams<{ id: string }>();
  const { ready, getEvent } = useEvents();
  const event = getEvent(params.id);

  if (!ready) {
    return (
      <p className="py-20 text-center text-sm font-light text-forest/50">
        Preparando a ficha da cozinha…
      </p>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-4xl">Ficha não encontrada</h1>
      </div>
    );
  }

  return <KitchenSheet event={event} />;
}
