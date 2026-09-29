"use client";

import { LoadingBlock } from "@/components/cadastros/ui";
import { CalendarBoard } from "@/components/events/calendar-board";
import { useEvents } from "@/components/events/events-provider";

export default function EventosPage() {
  const { events, ready } = useEvents();

  if (!ready) {
    return <LoadingBlock label="Carregando o calendário da casa…" />;
  }

  return <CalendarBoard events={events} />;
}
