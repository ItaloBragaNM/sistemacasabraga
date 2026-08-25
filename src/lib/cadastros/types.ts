import type { MenuSectionKey } from "@/lib/types";

/**
 * A "base" is a quantity taken from the event ficha (or derived from it) that
 * feeds the material calculation model. Each material multiplies up to three
 * factors of the form `base × multiplicador`.
 */
export type BaseKind =
  | { type: "guests" } // Convidados (adultos + crianças + profissionais)
  | { type: "staff"; role: "garcons" | "garconetes" | "copeiros" | "chefes" }
  | { type: "islands" } // Ilhas
  | { type: "serviceTeam" } // Equipe de serviço = garçons + garçonetes
  | { type: "perGuests"; per: number } // 1 a cada N convidados (ex.: fornos = 100)
  | { type: "dishes" } // nº de pratos do evento vinculados ao material
  | { type: "fixed" }; // valor fixo (1) — quantidade fixa por evento

export interface CalcBase {
  id: string;
  label: string;
  description: string;
  kind: BaseKind;
  /** Bases nativas não podem ser removidas. */
  builtIn: boolean;
}

export interface ProportionFactor {
  baseId: string;
  mult: number;
}

export interface MaterialRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  /** 1 a 3 fatores multiplicados entre si; resultado arredondado para cima. */
  factors: ProportionFactor[];
  createdAt: string;
  updatedAt: string;
}

export interface DishRecord {
  id: string;
  name: string;
  category: MenuSectionKey;
  /** Materiais (logística) vinculados ao prato. */
  materialIds: string[];
  /** Insumos (cozinha) vinculados — reservado para o cadastro de insumos. */
  insumoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CadastrosData {
  materials: MaterialRecord[];
  dishes: DishRecord[];
  materialCategories: string[];
  bases: CalcBase[];
}

export const MAX_FACTORS = 3;
