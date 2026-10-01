"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useSyncedStore } from "@/lib/store/use-synced-store";
import type {
  CadastrosData,
  CalcBase,
  ClienteRecord,
  DishRecord,
  ExtraCatalogItem,
  InsumoRecord,
  LocalRecord,
  MaterialKit,
  MaterialRecord,
  StockLocation,
  VeiculoRecord,
} from "@/lib/cadastros/types";
import { duplicateManyIn, type NamedRecord } from "@/lib/cadastros/clone";
import { DEFAULT_DRINK_PREMISES } from "@/lib/types";

export type CatalogListKey =
  | "materials"
  | "dishes"
  | "insumos"
  | "clientes"
  | "locais"
  | "veiculos"
  | "kits"
  | "extras"
  | "stockLocations";

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
  upsertLocal: (local: LocalRecord) => void;
  removeLocal: (id: string) => void;
  upsertVeiculo: (veiculo: VeiculoRecord) => void;
  removeVeiculo: (id: string) => void;
  upsertKit: (kit: MaterialKit) => void;
  removeKit: (id: string) => void;
  upsertExtra: (extra: ExtraCatalogItem) => void;
  removeExtra: (id: string) => void;
  upsertStockLocation: (location: StockLocation) => void;
  removeStockLocation: (id: string) => void;
  setDrinkPremises: (premises: CadastrosData["drinkPremises"]) => void;
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

function hydrateCadastros(raw: unknown): CadastrosData {
  const data = (raw && typeof raw === "object" ? raw : {}) as CadastrosData;
  return {
    ...data,
    kits: data.kits ?? [],
    extras: data.extras ?? [],
    stockLocations: data.stockLocations ?? [],
    locais: data.locais ?? [],
    drinkPremises: data.drinkPremises ?? DEFAULT_DRINK_PREMISES,
  };
}

export function CadastrosProvider({ children }: { children: React.ReactNode }) {
  const { data, ready, error, saving, mutate, replace } = useSyncedStore<CadastrosData | null>({
    url: "/api/cadastros",
    initial: null,
    loadError: "Não foi possível carregar os cadastros.",
    saveError: "Não foi possível salvar. Verifique a conexão e tente de novo.",
    mapData: (json) => hydrateCadastros(json.data),
  });

  const change = useCallback(
    (mutator: (current: CadastrosData) => CadastrosData) => {
      mutate((current) => (current ? mutator(current) : current));
    },
    [mutate],
  );

  const value = useMemo<CadastrosContextValue>(
    () => ({
      data,
      ready,
      error,
      saving,
      upsertMaterial: (material) =>
        change((current) => ({ ...current, materials: upsert(current.materials, material) })),
      removeMaterial: (id) =>
        change((current) => ({
          ...current,
          materials: current.materials.filter((item) => item.id !== id),
        })),
      upsertDish: (dish) =>
        change((current) => ({ ...current, dishes: upsert(current.dishes, dish) })),
      removeDish: (id) =>
        change((current) => ({
          ...current,
          dishes: current.dishes.filter((item) => item.id !== id),
        })),
      upsertBase: (base) =>
        change((current) => ({ ...current, bases: upsert(current.bases, base) })),
      removeBase: (id) =>
        change((current) => ({
          ...current,
          bases: current.bases.filter((item) => item.id !== id),
        })),
      setCategories: (categories) => change((current) => ({ ...current, materialCategories: categories })),
      setDishCategories: (categories) => change((current) => ({ ...current, dishCategories: categories })),
      upsertInsumo: (insumo) =>
        change((current) => ({ ...current, insumos: upsert(current.insumos, insumo) })),
      removeInsumo: (id) =>
        change((current) => ({
          ...current,
          insumos: current.insumos.filter((item) => item.id !== id),
        })),
      setInsumoCategories: (categories) =>
        change((current) => ({ ...current, insumoCategories: categories })),
      upsertCliente: (cliente) =>
        change((current) => ({ ...current, clientes: upsert(current.clientes, cliente) })),
      removeCliente: (id) =>
        change((current) => ({
          ...current,
          clientes: current.clientes.filter((item) => item.id !== id),
        })),
      upsertLocal: (local) =>
        change((current) => ({ ...current, locais: upsert(current.locais ?? [], local) })),
      removeLocal: (id) =>
        change((current) => ({
          ...current,
          locais: (current.locais ?? []).filter((item) => item.id !== id),
        })),
      upsertVeiculo: (veiculo) =>
        change((current) => ({ ...current, veiculos: upsert(current.veiculos, veiculo) })),
      removeVeiculo: (id) =>
        change((current) => ({
          ...current,
          veiculos: current.veiculos.filter((item) => item.id !== id),
        })),
      upsertKit: (kit) => change((current) => ({ ...current, kits: upsert(current.kits ?? [], kit) })),
      removeKit: (id) =>
        change((current) => ({
          ...current,
          kits: (current.kits ?? []).filter((item) => item.id !== id),
        })),
      upsertExtra: (extra) =>
        change((current) => ({ ...current, extras: upsert(current.extras ?? [], extra) })),
      removeExtra: (id) =>
        change((current) => ({
          ...current,
          extras: (current.extras ?? []).filter((item) => item.id !== id),
        })),
      upsertStockLocation: (location) =>
        change((current) => ({
          ...current,
          stockLocations: upsert(current.stockLocations ?? [], location),
        })),
      removeStockLocation: (id) =>
        change((current) => ({
          ...current,
          stockLocations: (current.stockLocations ?? []).filter((item) => item.id !== id),
        })),
      setDrinkPremises: (premises) => change((current) => ({ ...current, drinkPremises: premises })),
      removeMany: (key, ids) => {
        const drop = new Set(ids);
        change((current) => ({
          ...current,
          [key]: current[key].filter((item) => !drop.has(item.id)),
        }));
      },
      duplicateMany: (key, ids) =>
        change((current) => {
          const nextList = duplicateManyIn(current[key] as NamedRecord[], ids);
          if (key === "kits") {
            return {
              ...current,
              kits: (nextList as MaterialKit[]).map((kit) => ({
                ...kit,
                items: kit.items.map((item) => ({ ...item })),
              })),
            };
          }
          return { ...current, [key]: nextList };
        }),
      replaceAll: (next) => replace(next),
    }),
    [change, data, error, ready, replace, saving],
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
