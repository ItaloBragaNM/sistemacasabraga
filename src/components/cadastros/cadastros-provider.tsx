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
import type {
  CadastrosData,
  CalcBase,
  ClienteRecord,
  DishRecord,
  InsumoRecord,
  MaterialRecord,
  VeiculoRecord,
} from "@/lib/cadastros/types";
import { duplicateManyIn, type NamedRecord } from "@/lib/cadastros/clone";

export type CatalogListKey = "materials" | "dishes" | "insumos" | "clientes" | "veiculos";

interface CadastrosContextValue {
  data: CadastrosData | null;
  ready: boolean;
  error: string | null;
  saving: boolean;
  upsertMaterial: (material: MaterialRecord) => void;
  removeMaterial: (id: string) => void;
  upsertDish: (dish: DishRecord) => void;
  removeDish: (id: string) => void;
  upsertBase: (base: CalcBase) => void;
  removeBase: (id: string) => void;
  setCategories: (categories: string[]) => void;
  setDishCategories: (categories: string[]) => void;
  upsertInsumo: (insumo: InsumoRecord) => void;
  removeInsumo: (id: string) => void;
  setInsumoCategories: (categories: string[]) => void;
  upsertCliente: (cliente: ClienteRecord) => void;
  removeCliente: (id: string) => void;
  upsertVeiculo: (veiculo: VeiculoRecord) => void;
  removeVeiculo: (id: string) => void;
  removeMany: (key: CatalogListKey, ids: string[]) => void;
  duplicateMany: (key: CatalogListKey, ids: string[]) => void;
  replaceAll: (next: CadastrosData) => void;
}

const CadastrosContext = createContext<CadastrosContextValue | null>(null);

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index < 0) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

export function CadastrosProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CadastrosData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/cadastros", { cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const json = (await res.json()) as { data: CadastrosData };
        if (active) setData(json.data);
      } catch {
        if (active) setError("Não foi possível carregar os cadastros.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: CadastrosData) => {
    setData(next);
    setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const res = await fetch("/api/cadastros", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error("save");
      })
      .catch(() => {
        toast.error("Não foi possível salvar. Verifique a conexão e tente de novo.");
      })
      .finally(() => setSaving(false));
  }, []);

  const mutate = useCallback(
    (mutator: (current: CadastrosData) => CadastrosData) => {
      if (!data) return;
      persist(mutator(data));
    },
    [data, persist],
  );

  const value = useMemo<CadastrosContextValue>(
    () => ({
      data,
      ready,
      error,
      saving,
      upsertMaterial: (material) =>
        mutate((current) => ({ ...current, materials: upsert(current.materials, material) })),
      removeMaterial: (id) =>
        mutate((current) => ({
          ...current,
          materials: current.materials.filter((item) => item.id !== id),
        })),
      upsertDish: (dish) =>
        mutate((current) => ({ ...current, dishes: upsert(current.dishes, dish) })),
      removeDish: (id) =>
        mutate((current) => ({
          ...current,
          dishes: current.dishes.filter((item) => item.id !== id),
        })),
      upsertBase: (base) =>
        mutate((current) => ({ ...current, bases: upsert(current.bases, base) })),
      removeBase: (id) =>
        mutate((current) => ({
          ...current,
          bases: current.bases.filter((item) => item.id !== id),
        })),
      setCategories: (categories) => mutate((current) => ({ ...current, materialCategories: categories })),
      setDishCategories: (categories) => mutate((current) => ({ ...current, dishCategories: categories })),
      upsertInsumo: (insumo) =>
        mutate((current) => ({ ...current, insumos: upsert(current.insumos, insumo) })),
      removeInsumo: (id) =>
        mutate((current) => ({
          ...current,
          insumos: current.insumos.filter((item) => item.id !== id),
        })),
      setInsumoCategories: (categories) =>
        mutate((current) => ({ ...current, insumoCategories: categories })),
      upsertCliente: (cliente) =>
        mutate((current) => ({ ...current, clientes: upsert(current.clientes, cliente) })),
      removeCliente: (id) =>
        mutate((current) => ({
          ...current,
          clientes: current.clientes.filter((item) => item.id !== id),
        })),
      upsertVeiculo: (veiculo) =>
        mutate((current) => ({ ...current, veiculos: upsert(current.veiculos, veiculo) })),
      removeVeiculo: (id) =>
        mutate((current) => ({
          ...current,
          veiculos: current.veiculos.filter((item) => item.id !== id),
        })),
      removeMany: (key, ids) => {
        const drop = new Set(ids);
        mutate((current) => ({
          ...current,
          [key]: current[key].filter((item) => !drop.has(item.id)),
        }));
      },
      duplicateMany: (key, ids) =>
        mutate((current) => ({
          ...current,
          [key]: duplicateManyIn(current[key] as NamedRecord[], ids),
        })),
      replaceAll: (next) => persist(next),
    }),
    [data, ready, error, saving, mutate, persist],
  );

  return <CadastrosContext.Provider value={value}>{children}</CadastrosContext.Provider>;
}

export function useCadastros() {
  const context = useContext(CadastrosContext);
  if (!context) {
    throw new Error("useCadastros deve ser usado dentro de CadastrosProvider");
  }
  return context;
}
