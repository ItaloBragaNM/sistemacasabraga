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
import { toast } from "sonner";
import type { FichasTecnicasData, TechnicalSheet } from "@/lib/fichas-tecnicas/types";

interface FichasTecnicasContextValue {
  data: FichasTecnicasData | null;
  ready: boolean;
  upsertSheet: (sheet: TechnicalSheet) => void;
  removeSheet: (id: string) => void;
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
  const [data, setData] = useState<FichasTecnicasData | null>(null);
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/fichas-tecnicas", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: FichasTecnicasData };
        if (active) setData(json.data);
      } catch {
        if (active) toast.error("Não foi possível carregar as fichas técnicas.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: FichasTecnicasData) => {
    setData(next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/fichas-tecnicas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar as fichas técnicas.");
      });
  }, []);

  const upsertSheet = useCallback(
    (sheet: TechnicalSheet) => {
      if (!data) {
        persist({ sheets: [sheet] });
        return;
      }
      persist({ sheets: upsert(data.sheets, sheet) });
    },
    [data, persist],
  );

  const removeSheet = useCallback(
    (id: string) => {
      if (!data) return;
      persist({ sheets: data.sheets.filter((item) => item.id !== id) });
    },
    [data, persist],
  );

  const value = useMemo(
    () => ({ data, ready, upsertSheet, removeSheet }),
    [data, ready, upsertSheet, removeSheet],
  );

  return <FichasTecnicasContext.Provider value={value}>{children}</FichasTecnicasContext.Provider>;
}

export function useFichasTecnicas() {
  const context = useContext(FichasTecnicasContext);
  if (!context) throw new Error("useFichasTecnicas deve ser usado dentro de FichasTecnicasProvider");
  return context;
}
