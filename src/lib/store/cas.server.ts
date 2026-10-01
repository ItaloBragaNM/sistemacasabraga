import { readStateMeta, writeStateIfMatch } from "@/lib/store/kv.server";

export type SaveResult<T> =
  | { conflict: true; data: T; updatedAt: string }
  | { conflict: false; data: T; updatedAt: string };

export async function readStoreState<T>(
  key: string,
  fileName: string,
  revive: (raw: unknown) => T,
): Promise<{ data: T; updatedAt: string | null }> {
  const meta = await readStateMeta(key, fileName);
  return { data: revive(meta.value), updatedAt: meta.updatedAt };
}

export async function saveStoreState<T>(
  key: string,
  fileName: string,
  next: T,
  expectedUpdatedAt: string | null,
  revive: (raw: unknown) => T,
): Promise<SaveResult<T>> {
  const result = await writeStateIfMatch(key, fileName, next, expectedUpdatedAt);
  if (!result.ok) {
    return { conflict: true, data: revive(result.value), updatedAt: result.updatedAt };
  }
  return { conflict: false, data: next, updatedAt: result.updatedAt };
}
