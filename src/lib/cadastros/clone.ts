import { uid } from "@/lib/event-factory";

export type NamedRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export function copyName(name: string, existing: string[]): string {
  const stripped = name.replace(/\s+\(cópia(?: \d+)?\)$/i, "").trim() || name;
  const taken = new Set(existing.map((item) => item.toLowerCase()));
  let candidate = `${stripped} (cópia)`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${stripped} (cópia ${n})`;
    n += 1;
  }
  return candidate;
}

export function duplicateNamed<T extends NamedRecord>(item: T, existingNames: string[]): T {
  const now = new Date().toISOString();
  return {
    ...item,
    id: uid(),
    name: copyName(item.name, existingNames),
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateManyIn<T extends NamedRecord>(list: T[], ids: string[]): T[] {
  const originals = new Map(list.map((item) => [item.id, item]));
  const names = list.map((item) => item.name);
  const copies: T[] = [];
  for (const id of ids) {
    const item = originals.get(id);
    if (!item) continue;
    const copy = duplicateNamed(item, names);
    names.push(copy.name);
    copies.push(copy);
  }
  return copies.length ? [...list, ...copies] : list;
}
