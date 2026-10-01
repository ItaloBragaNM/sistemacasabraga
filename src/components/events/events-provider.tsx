"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import {
  createEvent,
  deleteEvent,
  eventsDiffer,
  findEvent,
  localEventsToMigrate,
  localEventsWereMigrated,
  markLocalEventsMigrated,
  mergeEvents,
  readLocalEvents,
  saveEvent,
} from "@/lib/store";
import type { EventRecord, EventSaveMeta } from "@/lib/types";
import type { PublicUser } from "@/lib/auth/types";
import { withChangeLog } from "@/lib/eventos/changelog";

type EventsContextValue = {
  events: EventRecord[];
  ready: boolean;
  getEvent: (id: string) => EventRecord | null;
  upsert: (event: EventRecord, meta?: EventSaveMeta) => EventRecord;
  remove: (id: string) => void;
  create: (draft?: Partial<EventRecord>) => EventRecord;
};

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authed = pathname !== "/login";
  const actorRef = useRef<PublicUser | null>(null);
  const migratedRef = useRef(false);
  const { data: events, ready, error, mutate } = useSyncedStore<EventRecord[]>({
    url: "/api/eventos",
    enabled: authed,
    initial: [],
    loadError: "Não foi possível carregar os eventos.",
    saveError: "Não foi possível salvar o evento. Verifique a conexão.",
    mapData: (json) => (Array.isArray(json.data) ? json.data : []),
  });

  useEffect(() => {
    if (!authed) return;
    let active = true;
    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionRes.ok) return;
        const session = (await sessionRes.json()) as { user?: PublicUser | null };
        if (active) actorRef.current = session.user ?? null;
      } catch {
        /* sessão opcional para o histórico da ficha */
      }
    })();
    return () => {
      active = false;
    };
  }, [authed]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!authed || !ready || migratedRef.current) return;
    if (localEventsWereMigrated()) {
      migratedRef.current = true;
      return;
    }
    const local = readLocalEvents();
    const incoming = local ? localEventsToMigrate(local) : [];
    if (incoming.length > 0) {
      const merged = mergeEvents(events, incoming);
      if (eventsDiffer(merged, events)) {
        mutate(() => merged);
      }
    }
    markLocalEventsMigrated();
    migratedRef.current = true;
  }, [authed, events, mutate, ready]);

  const upsert = useCallback(
    (event: EventRecord, meta?: EventSaveMeta) => {
      let logged = event;
      mutate((current) => {
        const previous = findEvent(current, event.id);
        logged = withChangeLog(previous, event, actorRef.current, meta);
        return saveEvent(current, logged);
      });
      return logged;
    },
    [mutate],
  );

  const remove = useCallback(
    (id: string) => {
      mutate((current) => deleteEvent(current, id));
    },
    [mutate],
  );

  const create = useCallback(
    (draft?: Partial<EventRecord>) => {
      let logged: EventRecord | null = null;
      mutate((current) => {
        const { event } = createEvent(current, draft);
        logged = withChangeLog(null, event, actorRef.current);
        return saveEvent(current, logged);
      });
      return logged ?? createEvent(events, draft).event;
    },
    [events, mutate],
  );

  const value = useMemo(
    () => ({
      events,
      ready,
      getEvent: (id: string) => findEvent(events, id),
      upsert,
      remove,
      create,
    }),
    [create, events, ready, remove, upsert],
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
