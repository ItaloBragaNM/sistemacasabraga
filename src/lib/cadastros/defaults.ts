import { MENU_SECTIONS } from "@/lib/types";
import type {
  CadastrosData,
  CalcBase,
  DishRecord,
  ExtraCatalogItem,
  InsumoRecord,
  MaterialKind,
  MaterialRecord,
} from "./types";

const SEED_DATE = "2026-01-01T00:00:00.000Z";

export const DEFAULT_INSUMO_CATEGORIES = [
  "Carnes",
  "Aves",
  "Peixes e Frutos do Mar",
  "Hortifruti",
  "Laticínios",
  "Mercearia",
  "Bebidas",
  "Descartáveis",
  "Outros",
];

export const DEFAULT_MATERIAL_CATEGORIES = [
  "Bandejas",
  "Café e Bebidas",
  "Consumíveis",
  "Copos e Taças",
  "Decoração",
  "Equipamentos",
  "Kits",
  "Logística e Transporte",
  "Mobiliário",
  "Peças de Serviço",
  "Pratos e Louças",
  "Ramequins",
  "Rechauds",
  "Serviço de Mesa",
  "Talheres",
  "Utensílios Cozinha",
  "Outros",
];

export const DEFAULT_DISH_CATEGORIES = MENU_SECTIONS.map((section) => section.label);

export const DEFAULT_BASES: CalcBase[] = [
  {
    id: "base-convidados",
    label: "Convidados",
    description: "Total de convidados da ficha (adultos + crianças + profissionais).",
    kind: { type: "guests" },
    builtIn: true,
  },
  {
    id: "base-garcons",
    label: "Garçons",
    description: "Quantidade de garçons da equipe do evento.",
    kind: { type: "staff", role: "garcons" },
    builtIn: true,
  },
  {
    id: "base-garconetes",
    label: "Garçonetes",
    description: "Quantidade de garçonetes da equipe do evento.",
    kind: { type: "staff", role: "garconetes" },
    builtIn: true,
  },
  {
    id: "base-copeiras",
    label: "Copeiras",
    description: "Quantidade de copeiras (copeiros) da equipe do evento.",
    kind: { type: "staff", role: "copeiros" },
    builtIn: true,
  },
  {
    id: "base-chefes",
    label: "Chefes",
    description: "Quantidade de chefes/staff da equipe do evento.",
    kind: { type: "staff", role: "chefes" },
    builtIn: true,
  },
  {
    id: "base-ilhas",
    label: "Ilhas",
    description: "Quantidade de ilhas (estações) do evento.",
    kind: { type: "islands" },
    builtIn: true,
  },
  {
    id: "base-equipe-servico",
    label: "Equipe de serviço",
    description: "Soma de garçons e garçonetes.",
    kind: { type: "serviceTeam" },
    builtIn: true,
  },
  {
    id: "base-fornos",
    label: "Fornos",
    description: "1 forno a cada 100 convidados (arredondado para cima).",
    kind: { type: "perGuests", per: 100 },
    builtIn: true,
  },
  {
    id: "base-pratos",
    label: "Nº de pratos",
    description: "Quantidade de pratos do evento que usam este material.",
    kind: { type: "dishes" },
    builtIn: true,
  },
  {
    id: "base-rechauds",
    label: "Rechauds",
    description: "Quantidade de pratos do cardápio do evento que possuem rechaud.",
    kind: { type: "dishesWith", tag: "rechaud" },
    builtIn: true,
  },
  {
    id: "base-fritadeiras",
    label: "Fritadeiras",
    description: "Quantidade de pratos do cardápio do evento que possuem fritadeira.",
    kind: { type: "dishesWith", tag: "fritadeira" },
    builtIn: true,
  },
  {
    id: "base-fixo",
    label: "Fixo por evento",
    description: "Valor fixo (1). Use o multiplicador para uma quantidade fixa por evento.",
    kind: { type: "fixed" },
    builtIn: true,
  },
];

function material(
  id: string,
  name: string,
  category: string,
  unit: string,
  factors: MaterialRecord["factors"],
  kind: MaterialKind = "permanente",
  variants: string[] = [],
): MaterialRecord {
  return {
    id,
    name,
    category,
    unit,
    kind,
    variants,
    factors,
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };
}

export const DEFAULT_MATERIALS: MaterialRecord[] = [
  material("mat-prato-raso", "Prato Raso", "Pratos e Louças", "un", [
    { baseId: "base-convidados", mult: 1.1 },
  ]),
  material("mat-copo-dose", "Copo de Dose", "Copos e Taças", "un", [
    { baseId: "base-convidados", mult: 1 },
    { baseId: "base-pratos", mult: 1 },
  ]),
  material("mat-saladeira", "Saladeira", "Pratos e Louças", "un", [
    { baseId: "base-pratos", mult: 1 },
    { baseId: "base-ilhas", mult: 1 },
  ]),
  material("mat-colher-servir", "Colher Grande para Servir", "Talheres", "un", [
    { baseId: "base-pratos", mult: 1 },
    { baseId: "base-ilhas", mult: 1 },
  ]),
  material("mat-rechaud", "Rechaud", "Rechauds", "un", [
    { baseId: "base-pratos", mult: 1 },
  ]),
  material("mat-palito-cheeseburger", "Palito para Cheeseburger", "Consumíveis", "un", [
    { baseId: "base-convidados", mult: 1 },
    { baseId: "base-pratos", mult: 1 },
  ], "descartavel"),
  material("mat-ramequim-vidro", "Ramequim de Vidro", "Ramequins", "un", [
    { baseId: "base-convidados", mult: 1.2 },
  ]),
  material("mat-colher-ramequim", "Colher para Ramequim", "Talheres", "un", [
    { baseId: "base-convidados", mult: 1 },
  ]),
  material("mat-acucar", "Açúcar", "Consumíveis", "sachê", [
    { baseId: "base-convidados", mult: 1.5 },
  ], "descartavel"),
  material("mat-adocante", "Adoçante", "Consumíveis", "sachê", [
    { baseId: "base-convidados", mult: 1.5 },
  ], "descartavel"),
  material("mat-bomboniere", "Bomboniere", "Peças de Serviço", "un", [
    { baseId: "base-convidados", mult: 0.02 },
  ]),
];

function dish(
  id: string,
  name: string,
  category: DishRecord["category"],
  materialIds: string[],
): DishRecord {
  return {
    id,
    name,
    category,
    materialIds,
    insumoIds: [],
    createdAt: SEED_DATE,
    updatedAt: SEED_DATE,
  };
}

export const DEFAULT_DISHES: DishRecord[] = [
  dish("dish-salada-caesar", "Salada Caesar", "Saladas", [
    "mat-saladeira",
    "mat-colher-servir",
    "mat-prato-raso",
  ]),
  dish("dish-burguer-fries", "Burguer'n'Fries", "Menu", [
    "mat-palito-cheeseburger",
    "mat-prato-raso",
  ]),
  dish("dish-risoto-camarao", "Risoto de Camarão", "Menu", [
    "mat-rechaud",
    "mat-prato-raso",
  ]),
  dish("dish-brigadeiro", "Brigadeiro Gourmet", "Sobremesas", [
    "mat-ramequim-vidro",
    "mat-colher-ramequim",
  ]),
  dish("dish-cafe", "Café e Adoçantes", "Altas Horas", [
    "mat-copo-dose",
    "mat-acucar",
    "mat-adocante",
    "mat-bomboniere",
  ]),
];

function insumo(
  id: string,
  name: string,
  category: string,
  unit: string,
): InsumoRecord {
  return { id, name, category, unit, notes: "", createdAt: SEED_DATE, updatedAt: SEED_DATE };
}

export const DEFAULT_INSUMOS: InsumoRecord[] = [
  insumo("ins-camarao", "Camarão limpo", "Peixes e Frutos do Mar", "kg"),
  insumo("ins-arroz-arboreo", "Arroz Arbóreo", "Mercearia", "kg"),
  insumo("ins-parmesao", "Queijo Parmesão", "Laticínios", "kg"),
  insumo("ins-alface", "Alface Romana", "Hortifruti", "un"),
  insumo("ins-blend-burger", "Blend de Hambúrguer", "Carnes", "kg"),
];

export const DEFAULT_EXTRAS: ExtraCatalogItem[] = [
  extra("extra-forno", "Forno"),
  extra("extra-mesa-maleta", "Mesa Maleta"),
  extra("extra-caixa-termica", "Caixa Térmica"),
  extra("extra-fogao-inducao", "Fogão de Indução"),
  extra("extra-microondas", "Micro-ondas"),
  extra("extra-toalha-retangular", "Toalha de Mesa Retangular"),
  extra("extra-toalha-apoio", "Toalha de Mesa de Apoio"),
  extra("extra-mesa-retangular", "Mesa Retangular"),
  extra("extra-panelas-inducao", "Panelas de Indução"),
];

function extra(id: string, name: string): ExtraCatalogItem {
  return { id, name, createdAt: SEED_DATE, updatedAt: SEED_DATE };
}

export function defaultCadastros(): CadastrosData {
  return {
    materials: structuredClone(DEFAULT_MATERIALS),
    dishes: structuredClone(DEFAULT_DISHES),
    materialCategories: [...DEFAULT_MATERIAL_CATEGORIES],
    dishCategories: [...DEFAULT_DISH_CATEGORIES],
    bases: structuredClone(DEFAULT_BASES),
    insumos: structuredClone(DEFAULT_INSUMOS),
    insumoCategories: [...DEFAULT_INSUMO_CATEGORIES],
    clientes: [],
    veiculos: [],
    kits: [],
    extras: structuredClone(DEFAULT_EXTRAS),
    stockLocations: [],
  };
}
