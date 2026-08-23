"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  createEvent,
  deleteEvent,
  findEvent,
  getEventsSnapshot,
  getServerEventsSnapshot,
  saveEvent,
  subscribeEvents,
} from "@/lib/store";
import type { EventRecord } from "@/lib/types";

type EventsContextValue = {
  events: EventRecord[];
  ready: boolean;
  getEvent: (id: string) => EventRecord | null;
  upsert: (event: EventRecord) => EventRecord;
  remove: (id: string) => void;
  create: (draft?: Partial<EventRecord>) => EventRecord;
};

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const events = useSyncExternalStore(
    subscribeEvents,
    getEventsSnapshot,
    getServerEventsSnapshot,
  );

  const upsert = useCallback((event: EventRecord) => {
    saveEvent(getEventsSnapshot(), event);
    return event;
  }, []);

  const remove = useCallback((id: string) => {
    deleteEvent(getEventsSnapshot(), id);
  }, []);

  const create = useCallback((draft?: Partial<EventRecord>) => {
    return createEvent(getEventsSnapshot(), draft).event;
  }, []);

  const value = useMemo(
    () => ({
      events,
      ready: true,
      getEvent: (id: string) => findEvent(events, id),
      upsert,
      remove,
      create,
    }),
    [create, events, remove, upsert],
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents deve ser usado dentro de EventsProvider");
  }
  return context;
}
