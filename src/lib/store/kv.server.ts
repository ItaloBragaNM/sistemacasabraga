import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { stampsEqual } from "@/lib/store/sync";

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

const FILE_ENVELOPE = 1 as const;

type FileEnvelope<T> = {
  __casabraga: typeof FILE_ENVELOPE;
  updatedAt: string;
  value: T;
};

export type StateMeta<T> = {
  value: T | null;
  updatedAt: string | null;
};

export type CasWriteResult<T> =
  | { ok: true; updatedAt: string }
  | { ok: false; value: T; updatedAt: string };

function filePath(fileName: string) {
  return path.join(DATA_DIR, fileName);
}

/** Na Vercel o disco é temporário: sem Supabase, gravar em arquivo perderia dados sem aviso. */
function assertFileFallbackAllowed() {
  if (process.env.VERCEL) {
    throw new Error("Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) neste deploy.");
  }
}

function stamp(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return value != null ? String(value) : null;
}

function isFileEnvelope<T>(raw: unknown): raw is FileEnvelope<T> {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      (raw as FileEnvelope<T>).__casabraga === FILE_ENVELOPE &&
      "value" in (raw as object) &&
      typeof (raw as FileEnvelope<T>).updatedAt === "string",
  );
}

function parseFileRaw<T>(raw: string): StateMeta<T> {
  const parsed = JSON.parse(raw) as unknown;
  if (isFileEnvelope<T>(parsed)) {
    return { value: parsed.value, updatedAt: parsed.updatedAt };
  }
  return { value: parsed as T, updatedAt: null };
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "23505" || Boolean(error?.message?.toLowerCase().includes("duplicate"));
}

async function readFileMeta<T>(fileName: string): Promise<StateMeta<T>> {
  assertFileFallbackAllowed();
  try {
    const raw = await readFile(filePath(fileName), "utf8");
    return parseFileRaw<T>(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { value: null, updatedAt: null };
    throw error;
  }
}

async function writeFileMeta<T>(fileName: string, value: T, updatedAt: string) {
  assertFileFallbackAllowed();
  await mkdir(DATA_DIR, { recursive: true });
  const envelope: FileEnvelope<T> = { __casabraga: FILE_ENVELOPE, updatedAt, value };
  await writeFile(filePath(fileName), JSON.stringify(envelope), "utf8");
}

export async function readStateMeta<T>(key: string, fileName: string): Promise<StateMeta<T>> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select("value, updated_at").eq("key", key).maybeSingle();
    if (error) throw new Error(`Supabase read (${key}): ${error.message}`);
    if (!data) return { value: null, updatedAt: null };
    return { value: (data.value as T) ?? null, updatedAt: stamp(data.updated_at) };
  }
  return readFileMeta<T>(fileName);
}

export async function readState<T>(key: string, fileName: string): Promise<T | null> {
  const meta = await readStateMeta<T>(key, fileName);
  return meta.value;
}

async function insertState<T>(
  key: string,
  fileName: string,
  value: T,
  updatedAt: string,
): Promise<CasWriteResult<T>> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ key, value, updated_at: updatedAt })
      .select("updated_at")
      .maybeSingle();
    if (!error && data) {
      return { ok: true, updatedAt: stamp(data.updated_at) ?? updatedAt };
    }
    if (error && !isUniqueViolation(error)) {
      throw new Error(`Supabase write (${key}): ${error.message}`);
    }
    const current = await readStateMeta<T>(key, fileName);
    if (current.value != null && current.updatedAt) {
      return { ok: false, value: current.value, updatedAt: current.updatedAt };
    }
    throw new Error(error ? `Supabase write (${key}): ${error.message}` : `Supabase write (${key}): insert failed`);
  }
  const current = await readFileMeta<T>(fileName);
  if (current.value != null) {
    return { ok: false, value: current.value, updatedAt: current.updatedAt ?? updatedAt };
  }
  await writeFileMeta(fileName, value, updatedAt);
  return { ok: true, updatedAt };
}

export async function writeStateIfMatch<T>(
  key: string,
  fileName: string,
  value: T,
  expectedUpdatedAt: string | null,
): Promise<CasWriteResult<T>> {
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  if (supabase) {
    if (!expectedUpdatedAt) {
      return insertState(key, fileName, value, now);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({ value, updated_at: now })
      .eq("key", key)
      .eq("updated_at", expectedUpdatedAt)
      .select("updated_at")
      .maybeSingle();
    if (error) throw new Error(`Supabase write (${key}): ${error.message}`);
    if (data) {
      return { ok: true, updatedAt: stamp(data.updated_at) ?? now };
    }

    const current = await readStateMeta<T>(key, fileName);
    if (current.value == null) {
      return insertState(key, fileName, value, now);
    }
    if (current.updatedAt && stampsEqual(expectedUpdatedAt, current.updatedAt)) {
      const { error: upsertError } = await supabase
        .from(TABLE)
        .upsert({ key, value, updated_at: now }, { onConflict: "key" });
      if (upsertError) throw new Error(`Supabase write (${key}): ${upsertError.message}`);
      const after = await readStateMeta<T>(key, fileName);
      return { ok: true, updatedAt: after.updatedAt ?? now };
    }
    return { ok: false, value: current.value, updatedAt: current.updatedAt ?? expectedUpdatedAt };
  }

  const current = await readFileMeta<T>(fileName);
  if (!expectedUpdatedAt) {
    if (current.value != null) {
      return { ok: false, value: current.value, updatedAt: current.updatedAt ?? now };
    }
    await writeFileMeta(fileName, value, now);
    return { ok: true, updatedAt: now };
  }
  if (current.value == null) {
    await writeFileMeta(fileName, value, now);
    return { ok: true, updatedAt: now };
  }
  if (!stampsEqual(expectedUpdatedAt, current.updatedAt)) {
    return { ok: false, value: current.value, updatedAt: current.updatedAt ?? expectedUpdatedAt };
  }
  await writeFileMeta(fileName, value, now);
  return { ok: true, updatedAt: now };
}

export async function writeState<T>(key: string, fileName: string, value: T): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  if (supabase) {
    const { error } = await supabase.from(TABLE).upsert({ key, value, updated_at: now }, { onConflict: "key" });
    if (error) throw new Error(`Supabase write (${key}): ${error.message}`);
    return;
  }

  await writeFileMeta(fileName, value, now);
}
