import { uid } from "@/lib/event-factory";
import { readState, writeState } from "@/lib/store/kv.server";
import { emptyAuditoria, type AuditAction, type AuditEntry, type AuditoriaData } from "./types";

const KEY = "auditoria";
const FILE = "auditoria.json";
const MAX_ENTRIES = 3000;

export type AuditActor = { id: string; name: string; username: string } | null;

export type AuditDraft = {
  module: string;
  entity: string;
  action: AuditAction;
  summary: string;
};

function normalize(input: Partial<AuditoriaData> | null): AuditoriaData {
  if (!input || !Array.isArray(input.entries)) return emptyAuditoria();
  const entries = input.entries.filter(
    (item): item is AuditEntry =>
      Boolean(item && item.id && item.at && item.action && item.summary),
  );
  return { entries };
}

export async function readAuditoria(): Promise<AuditoriaData> {
  return normalize(await readState<Partial<AuditoriaData>>(KEY, FILE));
}

export async function appendAudit(actor: AuditActor, drafts: AuditDraft[]): Promise<void> {
  const clean = drafts.filter((item) => item.summary.trim());
  if (clean.length === 0) return;
  const current = await readAuditoria();
  const at = new Date().toISOString();
  const userName = actor?.name?.trim() || actor?.username?.trim() || "Sistema";
  const userId = actor?.id ?? "";
  const incoming: AuditEntry[] = clean.map((draft) => ({
    id: uid(),
    at,
    userId,
    userName,
    module: draft.module,
    entity: draft.entity,
    action: draft.action,
    summary: draft.summary.trim(),
  }));
  const entries = [...incoming, ...current.entries].slice(0, MAX_ENTRIES);
  await writeState(KEY, FILE, { entries });
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

export function diffRecords<T extends { id: string }>(
  previous: T[],
  next: T[],
  label: (item: T) => string,
  snapshot: (item: T) => unknown = (item) => item,
): AuditDraft[] {
  const prevMap = new Map(previous.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));
  const drafts: AuditDraft[] = [];
  for (const item of next) {
    const before = prevMap.get(item.id);
    if (!before) {
      drafts.push({ module: "", entity: "", action: "criar", summary: label(item) });
      continue;
    }
    if (stable(snapshot(before)) !== stable(snapshot(item))) {
      drafts.push({ module: "", entity: "", action: "editar", summary: label(item) });
    }
  }
  for (const item of previous) {
    if (!nextMap.has(item.id)) {
      drafts.push({ module: "", entity: "", action: "excluir", summary: label(item) });
    }
  }
  return drafts;
}

export function tagged(
  drafts: AuditDraft[],
  module: string,
  entity: string,
): AuditDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    module,
    entity,
    summary: `${draft.action === "criar" ? "Criou" : draft.action === "excluir" ? "Excluiu" : "Editou"} ${entity} ${draft.summary}`.trim(),
  }));
}

export function scalarChange(
  module: string,
  entity: string,
  previous: unknown,
  next: unknown,
): AuditDraft[] {
  if (stable(previous) === stable(next)) return [];
  return [
    {
      module,
      entity,
      action: "editar",
      summary: `Editou ${entity}`,
    },
  ];
}
