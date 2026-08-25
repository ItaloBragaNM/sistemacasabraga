import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultCadastros } from "./defaults";
import type { CadastrosData } from "./types";

const DATA_DIR = process.env.CRM_DATA_DIR
  ? path.resolve(process.env.CRM_DATA_DIR)
  : path.join(process.cwd(), ".data");

const DATA_FILE = path.join(DATA_DIR, "cadastros.json");

function normalize(input: Partial<CadastrosData> | null): CadastrosData {
  const base = defaultCadastros();
  if (!input) return base;
  return {
    materials: Array.isArray(input.materials) ? input.materials : base.materials,
    dishes: Array.isArray(input.dishes) ? input.dishes : base.dishes,
    materialCategories:
      Array.isArray(input.materialCategories) && input.materialCategories.length
        ? input.materialCategories
        : base.materialCategories,
    bases: Array.isArray(input.bases) && input.bases.length ? input.bases : base.bases,
  };
}

export async function readCadastros(): Promise<CadastrosData> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return normalize(JSON.parse(raw) as Partial<CadastrosData>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return defaultCadastros();
    }
    throw error;
  }
}

export async function writeCadastros(data: CadastrosData): Promise<CadastrosData> {
  const normalized = normalize(data);
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(normalized), "utf8");
  return normalized;
}
