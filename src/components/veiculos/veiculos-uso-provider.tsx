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
  const [data, setData] = useState<VeiculosUsoData | null>(null);
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/veiculos", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: VeiculosUsoData };
        if (active) setData(json.data);
      } catch {
        if (active) toast.error("Não foi possível carregar o uso dos veículos.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: VeiculosUsoData) => {
    setData(next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/veiculos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar o uso dos veículos.");
      });
  }, []);

  const upsertUsage = useCallback(
    (usage: VehicleUsageRecord) => {
      if (!data) return;
      const others = data.usages.filter((item) => item.id !== usage.id);
      persist({ usages: [...others, usage] });
    },
    [data, persist],
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
      const usages = [...(data?.usages ?? []).filter((item) => item.id !== id), next];
      if (data) persist({ usages });
      return next;
    },
    [data, persist],
  );

  const markSigned = useCallback(
    (id: string) => {
      if (!data) return;
      persist({
        usages: data.usages.map((item) =>
          item.id === id ? { ...item, status: "assinado" as const } : item,
        ),
      });
    },
    [data, persist],
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
