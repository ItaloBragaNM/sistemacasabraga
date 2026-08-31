"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
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
  const pathname = usePathname();
  const authed = pathname !== "/login";
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [ready, setReady] = useState(false);
  const eventsRef = useRef<EventRecord[]>([]);
  const loadedRef = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((next: EventRecord[]) => {
    eventsRef.current = next;
    setEvents(next);
    if (!loadedRef.current) return;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/eventos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: eventsRef.current }),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar o evento. Verifique a conexão.");
      });
  }, []);

  useEffect(() => {
    if (!authed) return;
    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/eventos", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: EventRecord[] };
        let next = Array.isArray(json.data) ? json.data : [];

        if (!localEventsWereMigrated()) {
          const local = readLocalEvents();
          const incoming = local ? localEventsToMigrate(local) : [];
          if (incoming.length > 0) {
            const merged = mergeEvents(next, incoming);
            if (eventsDiffer(merged, next)) {
              const save = await fetch("/api/eventos", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: merged }),
              });
              if (!save.ok) throw new Error("migrate");
              next = merged;
            }
          }
          markLocalEventsMigrated();
        }

        if (active) {
          loadedRef.current = true;
          eventsRef.current = next;
          setEvents(next);
        }
      } catch {
        if (active) toast.error("Não foi possível carregar os eventos.");
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [authed]);

  const upsert = useCallback(
    (event: EventRecord) => {
      persist(saveEvent(eventsRef.current, event));
      return event;
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(deleteEvent(eventsRef.current, id));
    },
    [persist],
  );

  const create = useCallback(
    (draft?: Partial<EventRecord>) => {
      const { event, events: next } = createEvent(eventsRef.current, draft);
      persist(next);
      return event;
    },
    [persist],
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
