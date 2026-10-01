"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { assertSaved, saveErrorMessage } from "@/lib/http";
import { applyJobs, type SyncJob } from "@/lib/store/sync";

const POLL_MS = 8000;
const MAX_RETRIES = 5;

type SyncedEnvelope<T> = {
  data: T;
  updatedAt?: string | null;
};

export function useSyncedStore<T>({
  url,
  enabled = true,
  initial,
  loadError,
  saveError,
  mapData,
}: {
  url: string;
  enabled?: boolean;
  initial: T;
  loadError: string;
  saveError: string;
  mapData?: (json: SyncedEnvelope<unknown>) => T;
}) {
  const [data, setData] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ackedRef = useRef<T>(initial);
  const revisionRef = useRef<string | null>(null);
  const jobsRef = useRef<Array<SyncJob<T>>>([]);
  const flushingRef = useRef(false);
  const loadedRef = useRef(false);
  const queue = useRef(Promise.resolve());
  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  const publish = useCallback(() => {
    const next = applyJobs(ackedRef.current, jobsRef.current);
    setData(next);
    return next;
  }, []);

  const adopt = useCallback(
    (value: T, revision: string | null) => {
      ackedRef.current = value;
      revisionRef.current = revision;
      return publish();
    },
    [publish],
  );

  const parseResponse = useCallback((json: SyncedEnvelope<unknown>): T => {
    return mapDataRef.current ? mapDataRef.current(json) : (json.data as T);
  }, []);

  const pull = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (!force && (flushingRef.current || jobsRef.current.length > 0)) return;
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as SyncedEnvelope<unknown>;
      const revision = typeof json.updatedAt === "string" && json.updatedAt ? json.updatedAt : null;
      if (!force && revision && revision === revisionRef.current && jobsRef.current.length === 0) return;
      if (!force && (flushingRef.current || jobsRef.current.length > 0)) return;
      adopt(parseResponse(json), revision);
      loadedRef.current = true;
      setError(null);
    },
    [adopt, enabled, parseResponse, url],
  );

  const flush = useCallback(async () => {
    if (!enabled || flushingRef.current || !loadedRef.current) return;
    flushingRef.current = true;
    setSaving(true);
    try {
      while (jobsRef.current.length > 0) {
        const batch = jobsRef.current.slice();
        jobsRef.current = [];
        let revision = revisionRef.current;
        let next = applyJobs(ackedRef.current, batch);
        let attempts = 0;
        while (true) {
          const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: next, updatedAt: revision }),
          });
          if (res.ok) {
            const json = (await res.json()) as SyncedEnvelope<unknown>;
            const saved = json.data !== undefined ? parseResponse(json) : next;
            const savedRevision = typeof json.updatedAt === "string" && json.updatedAt ? json.updatedAt : revision;
            ackedRef.current = saved;
            revisionRef.current = savedRevision;
            publish();
            break;
          }
          if (res.status === 409 && attempts < MAX_RETRIES) {
            attempts += 1;
            const json = (await res.json()) as SyncedEnvelope<unknown> & { updatedAt?: string };
            const server = parseResponse(json);
            revision = typeof json.updatedAt === "string" && json.updatedAt ? json.updatedAt : null;
            ackedRef.current = server;
            revisionRef.current = revision;
            next = applyJobs(server, batch);
            publish();
            continue;
          }
          jobsRef.current = batch.concat(jobsRef.current);
          publish();
          assertSaved(res);
        }
      }
    } finally {
      flushingRef.current = false;
      setSaving(false);
    }
  }, [enabled, parseResponse, publish, url]);

  const mutate = useCallback(
    (job: SyncJob<T>) => {
      if (!enabled || !loadedRef.current) return;
      jobsRef.current = [...jobsRef.current, job];
      publish();
      queue.current = queue.current
        .catch(() => undefined)
        .then(flush)
        .catch((cause) => {
          toast.error(saveErrorMessage(cause, saveError));
        });
    },
    [enabled, flush, publish, saveError],
  );

  const replace = useCallback(
    (next: T) => {
      mutate(() => next);
    },
    [mutate],
  );

  useEffect(() => {
    if (!enabled) {
      loadedRef.current = false;
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      try {
        await pull(true);
      } catch {
        if (active) setError(loadError);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled, loadError, pull]);

  useEffect(() => {
    if (!enabled) return;
    const onTick = () => {
      void pull().catch(() => undefined);
    };
    const id = window.setInterval(onTick, POLL_MS);
    const onFocus = () => onTick();
    const onVisibility = () => {
      if (document.visibilityState === "visible") onTick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, pull]);

  return { data, ready, error, saving, mutate, replace, pull };
}
