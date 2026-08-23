"use client";

import { CalendarBoard } from "@/components/events/calendar-board";
import { useEvents } from "@/components/events/events-provider";

export default function EventosPage() {
  const { events, ready } = useEvents();

  if (!ready) {
    return (
      <p className="py-20 text-center text-sm font-light text-forest/50">
        Carregando o calendário da casa…
      </p>
    );
  }

  return <CalendarBoard events={events} />;
}
