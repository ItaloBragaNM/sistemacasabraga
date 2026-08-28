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
import { uid } from "@/lib/event-factory";
import type {
  InventorySession,
  LogisticaData,
  StockMeta,
  StockMovement,
} from "@/lib/logistica/types";

interface LogisticaContextValue {
  data: LogisticaData | null;
  ready: boolean;
  error: string | null;
  saving: boolean;
  addMovement: (movement: StockMovement) => void;
  addMovements: (movements: StockMovement[]) => void;
  upsertMeta: (meta: StockMeta) => void;
  concludeInventory: (session: InventorySession) => void;
}

const LogisticaContext = createContext<LogisticaContextValue | null>(null);

export function LogisticaProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LogisticaData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/logistica", { cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: LogisticaData };
        if (active) setData(json.data);
      } catch {
        if (active) setError("Não foi possível carregar o estoque.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: LogisticaData) => {
    setData(next);
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/logistica", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar o estoque. Verifique a conexão.");
      })
      .finally(() => setSaving(false));
  }, []);

  const mutate = useCallback(
    (mutator: (current: LogisticaData) => LogisticaData) => {
      setData((current) => {
        if (!current) return current;
        const next = mutator(current);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<LogisticaContextValue>(
    () => ({
      data,
      ready,
      error,
      saving,
      addMovement: (movement) =>
        mutate((current) => ({ ...current, movements: [...current.movements, movement] })),
      addMovements: (movements) =>
        mutate((current) => ({ ...current, movements: [...current.movements, ...movements] })),
      upsertMeta: (meta) =>
        mutate((current) => {
          const index = current.meta.findIndex((item) => item.materialId === meta.materialId);
          const next = [...current.meta];
          if (index < 0) next.push(meta);
          else next[index] = meta;
          return { ...current, meta: next };
        }),
      concludeInventory: (session) =>
        mutate((current) => {
          const movements: StockMovement[] = session.items
            .filter((item) => item.counted - item.previous !== 0)
            .map((item) => ({
              id: uid(),
              materialId: item.materialId,
              type: "inventario",
              quantity: item.counted - item.previous,
              date: session.date,
              note: `Inventário ${session.date}`,
              ref: session.id,
            }));
          return {
            ...current,
            movements: [...current.movements, ...movements],
            inventories: [...current.inventories, session],
          };
        }),
    }),
    [data, ready, error, saving, mutate],
  );

  return <LogisticaContext.Provider value={value}>{children}</LogisticaContext.Provider>;
}

export function useLogistica() {
  const context = useContext(LogisticaContext);
  if (!context) {
    throw new Error("useLogistica deve ser usado dentro de LogisticaProvider");
  }
  return context;
}
