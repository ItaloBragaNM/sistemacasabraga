"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useSyncedStore } from "@/lib/store/use-synced-store";
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
  const { data, ready, error, mutate, pull } = useSyncedStore<MaoDeObraData | null>({
    url: "/api/mao-de-obra",
    initial: null,
    loadError: "Não foi possível carregar a mão de obra externa.",
    saveError: "Não foi possível salvar a mão de obra. Verifique a conexão.",
    mapData: (json) => json.data as MaoDeObraData,
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const change = useCallback(
    (mutator: (current: MaoDeObraData) => MaoDeObraData) => {
      mutate((current) => (current ? mutator(current) : current));
    },
    [mutate],
  );

  const value = useMemo<MaoDeObraContextValue>(
    () => ({
      data,
      ready,
      reload: () => pull(true),
      upsertWorker: (worker) => change((current) => ({ ...current, workers: upsert(current.workers, worker) })),
      removeWorker: (id) =>
        change((current) => ({ ...current, workers: current.workers.filter((item) => item.id !== id) })),
      setRates: (rates) => change((current) => ({ ...current, rates })),
      setPayments: (payments) => change((current) => ({ ...current, payments })),
      removePayment: (id) =>
        change((current) => ({
          ...current,
          payments: current.payments.filter((item) => item.id !== id),
          dismissedPaymentIds: [...new Set([...(current.dismissedPaymentIds ?? []), id])],
        })),
    }),
    [change, data, pull, ready],
  );

  return <MaoDeObraContext.Provider value={value}>{children}</MaoDeObraContext.Provider>;
}

export function useMaoDeObra() {
  const context = useContext(MaoDeObraContext);
  if (!context) throw new Error("useMaoDeObra deve ser usado dentro de MaoDeObraProvider");
  return context;
}
