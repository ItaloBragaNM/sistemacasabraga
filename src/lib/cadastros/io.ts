import { uid } from "@/lib/event-factory";
import type { Cell } from "./xlsx";
import {
  CLIENT_KIND_LABELS,
  MATERIAL_KIND_LABELS,
  VEHICLE_KIND_LABELS,
  parseMaterialKind,
  parseVariants,
  type CadastrosData,
  type ClienteRecord,
  type ClientKind,
  type DishRecord,
  type InsumoRecord,
  type MaterialRecord,
  type ProportionFactor,
  type VehicleKind,
  type VeiculoRecord,
} from "./types";

export type EntityKey = "materials" | "dishes" | "insumos" | "clientes" | "veiculos";

export const ENTITY_LABELS: Record<EntityKey, string> = {
  materials: "materiais",
  dishes: "cardápio",
  insumos: "insumos",
  clientes: "clientes",
  veiculos: "veículos",
};

export interface ExportPayload {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: Cell[][];
}

export interface ImportResult {
  next: CadastrosData;
  created: number;
  updated: number;
}

function now() {
  return new Date().toISOString();
}

function parseNum(value: string): number {
  const raw = (value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* --------------------------------------------------------------- export */

export function buildExport(entity: EntityKey, data: CadastrosData): ExportPayload {
  const baseLabel = new Map(data.bases.map((b) => [b.id, b.label]));
  const materialName = new Map(data.materials.map((m) => [m.id, m.name]));

  switch (entity) {
    case "materials": {
      const headers = [
        "Nome",
        "Categoria",
        "Unidade",
        "Base 1",
        "Mult 1",
        "Base 2",
        "Mult 2",
        "Base 3",
        "Mult 3",
        "Tipo",
        "Variantes (estoque)",
      ];
      const rows = data.materials.map((m) => {
        const f = m.factors;
        return [
          m.name,
          m.category,
          m.unit,
          f[0] ? baseLabel.get(f[0].baseId) ?? "" : "",
          f[0] ? f[0].mult : "",
          f[1] ? baseLabel.get(f[1].baseId) ?? "" : "",
          f[1] ? f[1].mult : "",
          f[2] ? baseLabel.get(f[2].baseId) ?? "" : "",
          f[2] ? f[2].mult : "",
          MATERIAL_KIND_LABELS[m.kind],
          m.variants.join("; "),
        ] as Cell[];
      });
      return { fileName: "materiais", sheetName: "Materiais", headers, rows };
    }
    case "dishes": {
      const headers = ["Nome", "Categoria", "Materiais"];
      const rows = data.dishes.map(
        (d) =>
          [
            d.name,
            d.category,
            d.materialIds.map((id) => materialName.get(id)).filter(Boolean).join("; "),
          ] as Cell[],
      );
      return { fileName: "cardapio", sheetName: "Cardápio", headers, rows };
    }
    case "insumos": {
      const headers = ["Nome", "Categoria", "Unidade", "Observações"];
      const rows = data.insumos.map(
        (i) => [i.name, i.category, i.unit, i.notes] as Cell[],
      );
      return { fileName: "insumos", sheetName: "Insumos", headers, rows };
    }
    case "clientes": {
      const headers = [
        "Nome",
        "Tipo",
        "CPF/CNPJ",
        "Telefone",
        "E-mail",
        "Endereço",
        "Observações",
      ];
      const rows = data.clientes.map(
        (c) =>
          [
            c.name,
            CLIENT_KIND_LABELS[c.kind],
            c.document,
            c.phone,
            c.email,
            c.address,
            c.notes,
          ] as Cell[],
      );
      return { fileName: "clientes", sheetName: "Clientes", headers, rows };
    }
    case "veiculos": {
      const headers = [
        "Identificação",
        "Placa",
        "Modelo",
        "Ano",
        "Tipo",
        "Capacidade",
        "Observações",
      ];
      const rows = data.veiculos.map(
        (v) =>
          [
            v.name,
            v.plate,
            v.model,
            v.year,
            VEHICLE_KIND_LABELS[v.kind],
            v.capacity,
            v.notes,
          ] as Cell[],
      );
      return { fileName: "veiculos", sheetName: "Veículos", headers, rows };
    }
  }
}

/* --------------------------------------------------------------- import */

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key].trim();
  }
  return "";
}

function clientKindFromLabel(value: string): ClientKind {
  const lower = value.trim().toLowerCase();
  if (lower === "pj" || lower.includes("jur")) return "pj";
  return "pf";
}

function vehicleKindFromLabel(value: string): VehicleKind {
  const lower = value.trim().toLowerCase();
  if (lower.includes("van")) return "van";
  if (lower.includes("caminh")) return "caminhao";
  if (lower.includes("moto")) return "moto";
  if (lower.includes("carro")) return "carro";
  return "outro";
}

export function applyImport(
  entity: EntityKey,
  rows: Record<string, string>[],
  data: CadastrosData,
): ImportResult {
  const next: CadastrosData = structuredClone(data);
  let created = 0;
  let updated = 0;

  switch (entity) {
    case "materials": {
      const baseByLabel = new Map(next.bases.map((b) => [b.label.toLowerCase(), b.id]));
      const byName = new Map(next.materials.map((m) => [m.name.toLowerCase(), m]));
      const categories = new Set(next.materialCategories);
      for (const row of rows) {
        const name = pick(row, "Nome");
        if (!name) continue;
        const category = pick(row, "Categoria") || "Outros";
        if (!categories.has(category)) categories.add(category);
        const factors: ProportionFactor[] = [];
        for (let i = 1; i <= 3; i += 1) {
          const label = pick(row, `Base ${i}`);
          if (!label) continue;
          const baseId = baseByLabel.get(label.toLowerCase());
          if (!baseId) continue;
          factors.push({ baseId, mult: parseNum(pick(row, `Mult ${i}`)) || 1 });
        }
        const existing = byName.get(name.toLowerCase());
        const kind = pick(row, "Tipo") ? parseMaterialKind(pick(row, "Tipo")) : existing?.kind ?? "permanente";
        const variantsRaw = pick(row, "Variantes (estoque)", "Variantes");
        const variants = variantsRaw
          ? parseVariants(variantsRaw)
          : existing?.variants ?? [];
        if (existing) {
          Object.assign(existing, {
            category,
            unit: pick(row, "Unidade") || existing.unit,
            kind,
            variants,
            factors: factors.length ? factors : existing.factors,
            updatedAt: now(),
          });
          updated += 1;
        } else {
          const record: MaterialRecord = {
            id: uid(),
            name,
            category,
            unit: pick(row, "Unidade") || "un",
            kind,
            variants,
            factors,
            createdAt: now(),
            updatedAt: now(),
          };
          next.materials.push(record);
          byName.set(name.toLowerCase(), record);
          created += 1;
        }
      }
      next.materialCategories = [...categories];
      break;
    }
    case "dishes": {
      const materialByName = new Map(next.materials.map((m) => [m.name.toLowerCase(), m.id]));
      const byName = new Map(next.dishes.map((d) => [d.name.toLowerCase(), d]));
      const categories = new Set(next.dishCategories);
      for (const row of rows) {
        const name = pick(row, "Nome");
        if (!name) continue;
        const category = pick(row, "Categoria") || next.dishCategories[0] || "Menu";
        if (!categories.has(category)) categories.add(category);
        const materialIds = pick(row, "Materiais")
          .split(/[;,]/)
          .map((token) => materialByName.get(token.trim().toLowerCase()))
          .filter((id): id is string => Boolean(id));
        const existing = byName.get(name.toLowerCase());
        if (existing) {
          Object.assign(existing, { category, materialIds, updatedAt: now() });
          updated += 1;
        } else {
          const record: DishRecord = {
            id: uid(),
            name,
            category,
            materialIds,
            insumoIds: [],
            createdAt: now(),
            updatedAt: now(),
          };
          next.dishes.push(record);
          byName.set(name.toLowerCase(), record);
          created += 1;
        }
      }
      next.dishCategories = [...categories];
      break;
    }
    case "insumos": {
      const byName = new Map(next.insumos.map((i) => [i.name.toLowerCase(), i]));
      const categories = new Set(next.insumoCategories);
      for (const row of rows) {
        const name = pick(row, "Nome");
        if (!name) continue;
        const category = pick(row, "Categoria") || "Outros";
        if (!categories.has(category)) categories.add(category);
        const existing = byName.get(name.toLowerCase());
        if (existing) {
          Object.assign(existing, {
            category,
            unit: pick(row, "Unidade") || existing.unit,
            notes: pick(row, "Observações", "Observacoes"),
            updatedAt: now(),
          });
          updated += 1;
        } else {
          const record: InsumoRecord = {
            id: uid(),
            name,
            category,
            unit: pick(row, "Unidade") || "un",
            notes: pick(row, "Observações", "Observacoes"),
            createdAt: now(),
            updatedAt: now(),
          };
          next.insumos.push(record);
          byName.set(name.toLowerCase(), record);
          created += 1;
        }
      }
      next.insumoCategories = [...categories];
      break;
    }
    case "clientes": {
      const keyOf = (c: ClienteRecord) => (c.document.trim() || c.name.toLowerCase());
      const byKey = new Map(next.clientes.map((c) => [keyOf(c), c]));
      for (const row of rows) {
        const name = pick(row, "Nome");
        if (!name) continue;
        const document = pick(row, "CPF/CNPJ", "CPF", "CNPJ", "Documento");
        const key = document.trim() || name.toLowerCase();
        const patch = {
          name,
          kind: clientKindFromLabel(pick(row, "Tipo")),
          document,
          phone: pick(row, "Telefone"),
          email: pick(row, "E-mail", "Email"),
          address: pick(row, "Endereço", "Endereco"),
          notes: pick(row, "Observações", "Observacoes"),
          updatedAt: now(),
        };
        const existing = byKey.get(key);
        if (existing) {
          Object.assign(existing, patch);
          updated += 1;
        } else {
          const record: ClienteRecord = { id: uid(), createdAt: now(), ...patch };
          next.clientes.push(record);
          byKey.set(key, record);
          created += 1;
        }
      }
      break;
    }
    case "veiculos": {
      const keyOf = (v: VeiculoRecord) => (v.plate.trim().toUpperCase() || v.name.toLowerCase());
      const byKey = new Map(next.veiculos.map((v) => [keyOf(v), v]));
      for (const row of rows) {
        const name = pick(row, "Identificação", "Identificacao", "Nome");
        const plate = pick(row, "Placa");
        if (!name && !plate) continue;
        const key = plate.trim().toUpperCase() || name.toLowerCase();
        const patch = {
          name: name || plate,
          plate,
          model: pick(row, "Modelo"),
          year: pick(row, "Ano"),
          kind: vehicleKindFromLabel(pick(row, "Tipo")),
          capacity: pick(row, "Capacidade"),
          notes: pick(row, "Observações", "Observacoes"),
          updatedAt: now(),
        };
        const existing = byKey.get(key);
        if (existing) {
          Object.assign(existing, patch);
          updated += 1;
        } else {
          const record: VeiculoRecord = { id: uid(), createdAt: now(), ...patch };
          next.veiculos.push(record);
          byKey.set(key, record);
          created += 1;
        }
      }
      break;
    }
  }

  return { next, created, updated };
}
