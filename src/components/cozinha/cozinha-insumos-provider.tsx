"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { movementFromLoss, lossMovementId, movementsFromInsumoInventory } from "@/lib/cozinha/calc";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import type {
  CozinhaInsumosData,
  InsumoInventorySession,
  InsumoLoss,
  InsumoMeta,
  InsumoMovement,
} from "@/lib/cozinha/types";

interface CozinhaInsumosContextValue {
  data: CozinhaInsumosData | null;
  ready: boolean;
  addMovement: (movement: InsumoMovement) => void;
  upsertMeta: (meta: InsumoMeta) => void;
  addLoss: (loss: InsumoLoss) => void;
  removeLoss: (id: string) => void;
  concludeInventory: (session: InsumoInventorySession) => void;
  removeInventory: (id: string) => void;
}

const CozinhaInsumosContext = createContext<CozinhaInsumosContextValue | null>(null);

export function CozinhaInsumosProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, error, mutate } = useSyncedStore<CozinhaInsumosData | null>({
    url: "/api/cozinha-insumos",
    initial: null,
    loadError: "Não foi possível carregar o estoque de insumos.",
    saveError: "Não foi possível salvar o estoque de insumos. Verifique a conexão.",
    mapData: (json) => json.data as CozinhaInsumosData,
  });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const change = useCallback(
    (mutator: (current: CozinhaInsumosData) => CozinhaInsumosData) => {
      mutate((current) => (current ? mutator(current) : current));
    },
    [mutate],
  );

  const value = useMemo<CozinhaInsumosContextValue>(
    () => ({
      data,
      ready,
      addMovement: (movement) =>
        change((current) => ({ ...current, movements: [...current.movements, movement] })),
      upsertMeta: (meta) =>
        change((current) => {
          const others = current.meta.filter((item) => item.insumoId !== meta.insumoId);
          return { ...current, meta: [...others, meta] };
        }),
      addLoss: (loss) =>
        change((current) => ({
          ...current,
          losses: [...current.losses, loss],
          movements: [...current.movements, movementFromLoss(loss)],
        })),
      removeLoss: (id) =>
        change((current) => ({
          ...current,
          losses: current.losses.filter((item) => item.id !== id),
          movements: current.movements.filter((item) => item.id !== lossMovementId(id)),
        })),
      concludeInventory: (session) =>
        change((current) => ({
          ...current,
          inventories: [...(current.inventories ?? []).filter((item) => item.id !== session.id), session],
          movements: [
            ...current.movements.filter((item) => item.ref !== session.id),
            ...movementsFromInsumoInventory(session),
          ],
        })),
      removeInventory: (id) =>
        change((current) => ({
          ...current,
          inventories: (current.inventories ?? []).filter((item) => item.id !== id),
          movements: current.movements.filter((item) => item.ref !== id),
        })),
    }),
    [change, data, ready],
  );

  return <CozinhaInsumosContext.Provider value={value}>{children}</CozinhaInsumosContext.Provider>;
}

export function useCozinhaInsumos() {
  const context = useContext(CozinhaInsumosContext);
  if (!context) throw new Error("useCozinhaInsumos deve ser usado dentro de CozinhaInsumosProvider");
  return context;
}
