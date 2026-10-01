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
