"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import type { FichasTecnicasData, TechnicalSheet } from "@/lib/fichas-tecnicas/types";

interface FichasTecnicasContextValue {
  data: FichasTecnicasData | null;
  ready: boolean;
  upsertSheet: (sheet: TechnicalSheet) => void;
  removeSheet: (id: string) => void;
  replaceSheets: (sheets: TechnicalSheet[]) => void;
}

const FichasTecnicasContext = createContext<FichasTecnicasContextValue | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T) {
  const index = list.findIndex((row) => row.id === item.id);
  if (index < 0) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export function FichasTecnicasProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, error, mutate } = useSyncedStore<FichasTecnicasData | null>({
    url: "/api/fichas-tecnicas",
    initial: null,
    loadError: "Não foi possível carregar as fichas técnicas.",
    saveError: "Não foi possível salvar as fichas técnicas. Verifique a conexão.",
    mapData: (json) => json.data as FichasTecnicasData,
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const upsertSheet = useCallback(
    (sheet: TechnicalSheet) => {
      mutate((current) => ({ sheets: upsert(current?.sheets ?? [], sheet) }));
    },
    [mutate],
  );

  const removeSheet = useCallback(
    (id: string) => {
      mutate((current) => ({ sheets: (current?.sheets ?? []).filter((item) => item.id !== id) }));
    },
    [mutate],
  );

  const replaceSheets = useCallback(
    (sheets: TechnicalSheet[]) => {
      mutate(() => ({ sheets }));
    },
    [mutate],
  );

  const value = useMemo(
    () => ({ data, ready, upsertSheet, removeSheet, replaceSheets }),
    [data, ready, upsertSheet, removeSheet, replaceSheets],
  );

  return <FichasTecnicasContext.Provider value={value}>{children}</FichasTecnicasContext.Provider>;
}

export function useFichasTecnicas() {
  const context = useContext(FichasTecnicasContext);
  if (!context) throw new Error("useFichasTecnicas deve ser usado dentro de FichasTecnicasProvider");
  return context;
}
