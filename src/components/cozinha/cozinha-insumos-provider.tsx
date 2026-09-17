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
import { movementFromLoss, lossMovementId } from "@/lib/cozinha/calc";
import type { CozinhaInsumosData, InsumoLoss, InsumoMeta, InsumoMovement } from "@/lib/cozinha/types";

interface CozinhaInsumosContextValue {
  data: CozinhaInsumosData | null;
  ready: boolean;
  addMovement: (movement: InsumoMovement) => void;
  upsertMeta: (meta: InsumoMeta) => void;
  addLoss: (loss: InsumoLoss) => void;
  removeLoss: (id: string) => void;
}

const CozinhaInsumosContext = createContext<CozinhaInsumosContextValue | null>(null);

export function CozinhaInsumosProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CozinhaInsumosData | null>(null);
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/cozinha-insumos", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: CozinhaInsumosData };
        if (active) setData(json.data);
      } catch {
        if (active) toast.error("Não foi possível carregar o estoque de insumos.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: CozinhaInsumosData) => {
    setData(next);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/cozinha-insumos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar o estoque de insumos.");
      });
  }, []);

  const mutate = useCallback(
    (mutator: (current: CozinhaInsumosData) => CozinhaInsumosData) => {
      if (!data) return;
      persist(mutator(data));
    },
    [data, persist],
  );

  const value = useMemo<CozinhaInsumosContextValue>(
    () => ({
      data,
      ready,
      addMovement: (movement) =>
        mutate((current) => ({ ...current, movements: [...current.movements, movement] })),
      upsertMeta: (meta) =>
        mutate((current) => {
          const others = current.meta.filter((item) => item.insumoId !== meta.insumoId);
          return { ...current, meta: [...others, meta] };
        }),
      addLoss: (loss) =>
        mutate((current) => ({
          ...current,
          losses: [...current.losses, loss],
          movements: [...current.movements, movementFromLoss(loss)],
        })),
      removeLoss: (id) =>
        mutate((current) => ({
          ...current,
          losses: current.losses.filter((item) => item.id !== id),
          movements: current.movements.filter((item) => item.id !== lossMovementId(id)),
        })),
    }),
    [data, ready, mutate],
  );

  return <CozinhaInsumosContext.Provider value={value}>{children}</CozinhaInsumosContext.Provider>;
}

export function useCozinhaInsumos() {
  const context = useContext(CozinhaInsumosContext);
  if (!context) throw new Error("useCozinhaInsumos deve ser usado dentro de CozinhaInsumosProvider");
  return context;
}
