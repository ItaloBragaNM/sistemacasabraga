"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import { usageIdFor, type VehicleUsageRecord, type VeiculosUsoData } from "@/lib/veiculos/types";

interface VeiculosUsoContextValue {
  data: VeiculosUsoData | null;
  ready: boolean;
  upsertUsage: (usage: VehicleUsageRecord) => void;
  markGenerated: (eventId: string, vehicleId: string) => VehicleUsageRecord;
  markSigned: (id: string) => void;
}

const VeiculosUsoContext = createContext<VeiculosUsoContextValue | null>(null);

export function VeiculosUsoProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, error, mutate } = useSyncedStore<VeiculosUsoData | null>({
    url: "/api/veiculos",
    initial: null,
    loadError: "Não foi possível carregar o uso dos veículos.",
    saveError: "Não foi possível salvar o uso dos veículos. Verifique a conexão.",
    mapData: (json) => json.data as VeiculosUsoData,
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const upsertUsage = useCallback(
    (usage: VehicleUsageRecord) => {
      mutate((current) => {
        if (!current) return current;
        return { usages: [...current.usages.filter((item) => item.id !== usage.id), usage] };
      });
    },
    [mutate],
  );

  const markGenerated = useCallback(
    (eventId: string, vehicleId: string) => {
      const id = usageIdFor(eventId, vehicleId);
      const previous = data?.usages.find((item) => item.id === id);
      const next: VehicleUsageRecord = {
        id,
        eventId,
        vehicleId,
        status: previous?.status === "assinado" ? "assinado" : "gerado",
        generatedAt: new Date().toISOString(),
        notes: previous?.notes ?? "",
      };
      mutate((current) => ({
        usages: [...(current?.usages ?? []).filter((item) => item.id !== id), next],
      }));
      return next;
    },
    [data, mutate],
  );

  const markSigned = useCallback(
    (id: string) => {
      mutate((current) => {
        if (!current) return current;
        return {
          usages: current.usages.map((item) => (item.id === id ? { ...item, status: "assinado" as const } : item)),
        };
      });
    },
    [mutate],
  );

  const value = useMemo(
    () => ({ data, ready, upsertUsage, markGenerated, markSigned }),
    [data, ready, upsertUsage, markGenerated, markSigned],
  );

  return <VeiculosUsoContext.Provider value={value}>{children}</VeiculosUsoContext.Provider>;
}

export function useVeiculosUso() {
  const context = useContext(VeiculosUsoContext);
  if (!context) throw new Error("useVeiculosUso deve ser usado dentro de VeiculosUsoProvider");
  return context;
}
