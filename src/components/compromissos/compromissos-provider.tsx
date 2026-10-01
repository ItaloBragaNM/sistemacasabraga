"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import { emptyCompromissos, type CompromissosData, type MeetingRecord } from "@/lib/compromissos/types";

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
  const { data, ready, error, mutate } = useSyncedStore<CompromissosData>({
    url: "/api/eventos/compromissos",
    initial: emptyCompromissos(),
    loadError: "Não foi possível carregar os compromissos.",
    saveError: "Não foi possível salvar o compromisso. Verifique a conexão.",
    mapData: (json) => ({ meetings: (json.data as CompromissosData | undefined)?.meetings ?? [] }),
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const upsertMeeting = useCallback(
    (meeting: MeetingRecord) => {
      mutate((current) => ({ meetings: upsert(current.meetings, meeting) }));
    },
    [mutate],
  );

  const removeMeeting = useCallback(
    (id: string) => {
      mutate((current) => ({ meetings: current.meetings.filter((item) => item.id !== id) }));
    },
    [mutate],
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
