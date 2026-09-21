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
import type { ExternalWorker, LaborPayment, LaborRate, MaoDeObraData } from "@/lib/mao-de-obra/types";

interface MaoDeObraContextValue {
  data: MaoDeObraData | null;
  ready: boolean;
  reload: () => Promise<void>;
  upsertWorker: (worker: ExternalWorker) => void;
  removeWorker: (id: string) => void;
  setRates: (rates: LaborRate[]) => void;
  setPayments: (payments: LaborPayment[]) => void;
  removePayment: (id: string) => void;
}

const MaoDeObraContext = createContext<MaoDeObraContextValue | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T) {
  const index = list.findIndex((row) => row.id === item.id);
  if (index < 0) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export function MaoDeObraProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MaoDeObraData | null>(null);
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mao-de-obra", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as { data: MaoDeObraData };
      setData(json.data);
    } catch {
      toast.error("Não foi possível carregar a mão de obra externa.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const persist = useCallback((next: MaoDeObraData) => {
    setData(next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/mao-de-obra", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar a mão de obra externa.");
      });
  }, []);

  const mutate = useCallback(
    (mutator: (current: MaoDeObraData) => MaoDeObraData) => {
      if (!data) return;
      persist(mutator(data));
    },
    [data, persist],
  );

  const value = useMemo<MaoDeObraContextValue>(
    () => ({
      data,
      ready,
      reload: load,
      upsertWorker: (worker) => mutate((current) => ({ ...current, workers: upsert(current.workers, worker) })),
      removeWorker: (id) =>
        mutate((current) => ({ ...current, workers: current.workers.filter((item) => item.id !== id) })),
      setRates: (rates) => mutate((current) => ({ ...current, rates })),
      setPayments: (payments) => mutate((current) => ({ ...current, payments })),
      removePayment: (id) =>
        mutate((current) => ({
          ...current,
          payments: current.payments.filter((item) => item.id !== id),
          dismissedPaymentIds: [...new Set([...(current.dismissedPaymentIds ?? []), id])],
        })),
    }),
    [data, ready, load, mutate],
  );

  return <MaoDeObraContext.Provider value={value}>{children}</MaoDeObraContext.Provider>;
}

export function useMaoDeObra() {
  const context = useContext(MaoDeObraContext);
  if (!context) throw new Error("useMaoDeObra deve ser usado dentro de MaoDeObraProvider");
  return context;
}
