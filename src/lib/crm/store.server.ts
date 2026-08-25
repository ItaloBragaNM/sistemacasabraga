import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CrmSnapshot } from "./types";

const DATA_DIR = process.env.CRM_DATA_DIR
  ? path.resolve(process.env.CRM_DATA_DIR)
  : path.join(process.cwd(), ".data");

const DATA_FILE = path.join(DATA_DIR, "comercial-crm.json");

export async function readSnapshot(): Promise<CrmSnapshot | null> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as CrmSnapshot;
    if (!parsed || !Array.isArray(parsed.leads)) return null;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeSnapshot(snapshot: CrmSnapshot): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(snapshot), "utf8");
}
