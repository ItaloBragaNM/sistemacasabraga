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

/** Permanente volta do evento; descartável consome-se; misto = kits com os dois. */
export const MATERIAL_KINDS = ["permanente", "descartavel", "misto"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  permanente: "Permanente",
  descartavel: "Descartável",
  misto: "Misto",
};

export function isMaterialKind(value: unknown): value is MaterialKind {
  return MATERIAL_KINDS.includes(value as MaterialKind);
}

export function parseMaterialKind(value: string): MaterialKind {
  const lower = value.trim().toLowerCase();
  if (lower.startsWith("desc")) return "descartavel";
  if (lower.startsWith("mist")) return "misto";
  return "permanente";
}

export function parseVariants(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export interface MaterialRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  /** Como o item entra no estoque (volta, consome-se, ou kit misto). */
  kind: MaterialKind;
  /** Marca, cor, tamanho, modelo — SKUs físicos sob o mesmo material. */
  variants: string[];
  /** 1 a 3 fatores multiplicados entre si; resultado arredondado para cima. */
  factors: ProportionFactor[];
  createdAt: string;
  updatedAt: string;
}

export interface DishRecord {
  id: string;
  name: string;
  /** Nome da categoria do catálogo (configurável em Cadastros → Configurações). */
  category: string;
  /** Materiais (logística) vinculados ao prato. */
  materialIds: string[];
  /** Insumos (cozinha) vinculados — reservado para o cadastro de insumos. */
  insumoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InsumoRecord {
  id: string;
  name: string;
  category: string;
  unit: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientKind = "pf" | "pj";

export interface ClienteRecord {
  id: string;
  name: string;
  kind: ClientKind;
  document: string; // CPF ou CNPJ
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const CLIENT_KIND_LABELS: Record<ClientKind, string> = {
  pf: "Pessoa física",
  pj: "Pessoa jurídica",
};

export type VehicleKind = "carro" | "van" | "caminhao" | "moto" | "outro";

export interface VeiculoRecord {
  id: string;
  name: string; // identificação/apelido
  plate: string;
  model: string;
  year: string;
  kind: VehicleKind;
  capacity: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const VEHICLE_KIND_LABELS: Record<VehicleKind, string> = {
  carro: "Carro",
  van: "Van",
  caminhao: "Caminhão",
  moto: "Moto",
  outro: "Outro",
};

export interface CadastrosData {
  materials: MaterialRecord[];
  dishes: DishRecord[];
  materialCategories: string[];
  dishCategories: string[];
  bases: CalcBase[];
  insumos: InsumoRecord[];
  insumoCategories: string[];
  clientes: ClienteRecord[];
  veiculos: VeiculoRecord[];
}

export const MAX_FACTORS = 3;
