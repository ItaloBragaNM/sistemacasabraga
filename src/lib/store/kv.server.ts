import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Shared key/value store for app-wide data (commercial dashboard snapshot,
 * cadastros, …).
 *
 * - When Supabase is configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
 *   values live in the `app_state` table (jsonb) and are shared across every
 *   deploy/instance — required on Vercel, where the filesystem is ephemeral.
 * - Otherwise it falls back to JSON files under `.data/`, keeping local
 *   development working with zero configuration.
 */

const TABLE = "app_state";

const DATA_DIR = process.env.CRM_DATA_DIR
  ? path.resolve(process.env.CRM_DATA_DIR)
  : path.join(process.cwd(), ".data");

function filePath(fileName: string) {
  return path.join(DATA_DIR, fileName);
}

export async function readState<T>(key: string, fileName: string): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error(`Supabase read (${key}): ${error.message}`);
    return (data?.value as T) ?? null;
  }

  try {
    const raw = await readFile(filePath(fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeState<T>(key: string, fileName: string, value: T): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(`Supabase write (${key}): ${error.message}`);
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath(fileName), JSON.stringify(value), "utf8");
}
