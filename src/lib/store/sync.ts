export type SyncJob<T> = (current: T) => T;

export function applyJobs<T>(base: T, jobs: Array<SyncJob<T>>): T {
  return jobs.reduce((data, job) => job(data), base);
}

export function unwrapPutPayload(payload: unknown): { body: unknown; updatedAt: string | null } {
  if (Array.isArray(payload)) return { body: payload, updatedAt: null };
  if (payload && typeof payload === "object" && "data" in payload) {
    const row = payload as { data: unknown; updatedAt?: unknown };
    return {
      body: row.data,
      updatedAt: typeof row.updatedAt === "string" && row.updatedAt.length > 0 ? row.updatedAt : null,
    };
  }
  return { body: payload, updatedAt: null };
}

export function stampsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  return Number.isFinite(left) && left === right;
}

function stable(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordId(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const id = (item as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id : null;
}

function looksLikeRecordList(list: unknown[]): boolean {
  if (list.length === 0) return false;
  const withId = list.filter((item) => recordId(item)).length;
  return withId * 2 >= list.length;
}

function mapById(list: unknown[]) {
  const map = new Map<string, unknown>();
  for (const item of list) {
    const id = recordId(item);
    if (id) map.set(id, item);
  }
  return map;
}

function mergeIdLists(base: unknown[], server: unknown[], local: unknown[]): unknown[] {
  const baseMap = mapById(base);
  const serverMap = mapById(server);
  const localMap = mapById(local);
  const seen = new Set<string>();
  const out: unknown[] = [];

  const consider = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const before = baseMap.get(id);
    const theirs = serverMap.get(id);
    const ours = localMap.get(id);
    if (ours === undefined && theirs === undefined) return;
    if (ours === undefined) {
      if (before === undefined) {
        out.push(theirs);
        return;
      }
      if (stable(theirs) === stable(before)) return;
      out.push(theirs);
      return;
    }
    if (theirs === undefined) {
      if (before === undefined) {
        out.push(ours);
        return;
      }
      if (stable(ours) === stable(before)) return;
      out.push(ours);
      return;
    }
    out.push(threeWayMerge(before, theirs, ours));
  };

  for (const item of server) {
    const id = recordId(item);
    if (id) consider(id);
  }
  for (const item of local) {
    const id = recordId(item);
    if (id) consider(id);
  }
  return out;
}

function mergePrimitiveLists(base: unknown[], server: unknown[], local: unknown[]): unknown[] {
  if (stable(local) === stable(base)) return server;
  if (stable(server) === stable(base)) return local;
  const baseKeys = new Set(base.map(stable));
  const serverKeys = new Set(server.map(stable));
  const localKeys = new Set(local.map(stable));
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of [...server, ...local]) {
    const key = stable(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const inBase = baseKeys.has(key);
    const inServer = serverKeys.has(key);
    const inLocal = localKeys.has(key);
    if (inBase && !inLocal && inServer) continue;
    if (inBase && inLocal && !inServer) continue;
    out.push(item);
  }
  return out;
}

/**
 * Une a versão confirmada (base), a do servidor e a que estamos gravando.
 * Campos que só um lado mudou são preservados; o mesmo campo nos dois lados
 * fica com o valor de quem está salvando — a outra versão vai para o histórico.
 */
export function threeWayMerge<T>(base: T, server: T, local: T): T {
  if (stable(local) === stable(server)) return server;
  if (stable(local) === stable(base)) return server;
  if (stable(server) === stable(base)) return local;

  if (Array.isArray(local) && Array.isArray(server)) {
    const baseList = Array.isArray(base) ? base : [];
    if (looksLikeRecordList(local) || looksLikeRecordList(server) || looksLikeRecordList(baseList)) {
      return mergeIdLists(baseList, server, local) as T;
    }
    return mergePrimitiveLists(baseList, server, local) as T;
  }

  if (isPlainObject(local) && isPlainObject(server)) {
    const baseObj = isPlainObject(base) ? base : {};
    const keys = new Set([...Object.keys(baseObj), ...Object.keys(server), ...Object.keys(local)]);
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      out[key] = threeWayMerge(
        baseObj[key] as T,
        server[key] as T,
        local[key] as T,
      );
    }
    return out as T;
  }

  return local;
}

export function stableEqual(left: unknown, right: unknown) {
  return stable(left) === stable(right);
}
