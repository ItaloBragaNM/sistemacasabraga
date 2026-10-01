"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { uid } from "@/lib/event-factory";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import type {
  EventMaterialControl,
  InventorySession,
  LogisticaData,
  StockMeta,
  StockMovement,
} from "@/lib/logistica/types";
import { stockMovementsFromControl } from "@/lib/logistica/event-control";

interface LogisticaContextValue {
  data: LogisticaData | null;
  ready: boolean;
  error: string | null;
  saving: boolean;
  addMovement: (movement: StockMovement) => void;
  addMovements: (movements: StockMovement[]) => void;
  upsertMeta: (meta: StockMeta) => void;
  concludeInventory: (session: InventorySession) => void;
  updateInventory: (session: InventorySession) => void;
  removeInventory: (id: string) => void;
  upsertEventControl: (control: EventMaterialControl) => void;
  removeEventControl: (id: string) => void;
}

function movementsFromInventory(session: InventorySession): StockMovement[] {
  return session.items
    .filter((item) => item.counted - item.previous !== 0)
    .map((item) => ({
      id: uid(),
      materialId: item.materialId,
      variant: item.variant ?? "",
      type: "inventario" as const,
      quantity: item.counted - item.previous,
      date: session.date,
      note: `Inventário ${session.date}`,
      ref: session.id,
    }));
}

const LogisticaContext = createContext<LogisticaContextValue | null>(null);

export function LogisticaProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, error, saving, mutate } = useSyncedStore<LogisticaData | null>({
    url: "/api/logistica",
    initial: null,
    loadError: "Não foi possível carregar o estoque.",
    saveError: "Não foi possível salvar o estoque. Verifique a conexão.",
    mapData: (json) => json.data as LogisticaData,
  });

  const change = useCallback(
    (mutator: (current: LogisticaData) => LogisticaData) => {
      mutate((current) => (current ? mutator(current) : current));
    },
    [mutate],
  );

  const value = useMemo<LogisticaContextValue>(
    () => ({
      data,
      ready,
      error,
      saving,
      addMovement: (movement) =>
        change((current) => ({ ...current, movements: [...current.movements, movement] })),
      addMovements: (movements) =>
        change((current) => ({ ...current, movements: [...current.movements, ...movements] })),
      upsertMeta: (meta) =>
        change((current) => {
          const index = current.meta.findIndex((item) => item.materialId === meta.materialId);
          const next = [...current.meta];
          if (index < 0) next.push(meta);
          else next[index] = meta;
          return { ...current, meta: next };
        }),
      concludeInventory: (session) =>
        change((current) => ({
          ...current,
          movements: [...current.movements, ...movementsFromInventory(session)],
          inventories: [...current.inventories, session],
        })),
      updateInventory: (session) =>
        change((current) => ({
          ...current,
          movements: [
            ...current.movements.filter((movement) => movement.ref !== session.id),
            ...movementsFromInventory(session),
          ],
          inventories: current.inventories.map((item) => (item.id === session.id ? session : item)),
        })),
      removeInventory: (id) =>
        change((current) => ({
          ...current,
          movements: current.movements.filter((movement) => movement.ref !== id),
          inventories: current.inventories.filter((item) => item.id !== id),
        })),
      upsertEventControl: (control) =>
        change((current) => {
          const others = (current.eventControls ?? []).filter(
            (item) => item.id !== control.id && item.eventId !== control.eventId,
          );
          return {
            ...current,
            eventControls: [...others, control],
            movements: [
              ...current.movements.filter((movement) => movement.ref !== control.id),
              ...stockMovementsFromControl(control),
            ],
          };
        }),
      removeEventControl: (id) =>
        change((current) => ({
          ...current,
          eventControls: (current.eventControls ?? []).filter((item) => item.id !== id),
          movements: current.movements.filter((movement) => movement.ref !== id),
        })),
    }),
    [change, data, error, ready, saving],
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
