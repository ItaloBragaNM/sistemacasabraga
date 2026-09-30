"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { assertSaved, saveErrorMessage } from "@/lib/http";
import type { CompromissosData, MeetingRecord } from "@/lib/compromissos/types";

interface CompromissosContextValue {
  meetings: MeetingRecord[];
  ready: boolean;
  upsertMeeting: (meeting: MeetingRecord) => void;
  removeMeeting: (id: string) => void;
}

const CompromissosContext = createContext<CompromissosContextValue | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T) {
  const index = list.findIndex((row) => row.id === item.id);
  if (index < 0) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export function CompromissosProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CompromissosData>({ meetings: [] });
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  const queue = useRef<Promise<void>>(Promise.resolve());
  dataRef.current = data;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/eventos/compromissos", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: CompromissosData };
        if (active) setData({ meetings: json.data.meetings ?? [] });
      } catch {
        if (active) toast.error("Não foi possível carregar os compromissos.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: CompromissosData) => {
    dataRef.current = next;
    setData(next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/eventos/compromissos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataRef.current),
        });
        assertSaved(res);
      })
      .catch((error) => {
        toast.error(saveErrorMessage(error, "Não foi possível salvar o compromisso. Verifique a conexão."));
      });
  }, []);

  const upsertMeeting = useCallback(
    (meeting: MeetingRecord) => {
      persist({ meetings: upsert(dataRef.current.meetings, meeting) });
    },
    [persist],
  );

  const removeMeeting = useCallback(
    (id: string) => {
      persist({ meetings: dataRef.current.meetings.filter((item) => item.id !== id) });
    },
    [persist],
  );

  const value = useMemo(
    () => ({ meetings: data.meetings, ready, upsertMeeting, removeMeeting }),
    [data.meetings, ready, upsertMeeting, removeMeeting],
  );

  return <CompromissosContext.Provider value={value}>{children}</CompromissosContext.Provider>;
}

export function useCompromissos() {
  const context = useContext(CompromissosContext);
  if (!context) throw new Error("useCompromissos deve ser usado dentro de CompromissosProvider");
  return context;
}
