import { uid } from "@/lib/event-factory";
import { readState, writeState } from "@/lib/store/kv.server";
import { stableEqual } from "@/lib/store/sync";

export const VERSIONED_STORES = [
  { id: "eventos", key: "eventos", file: "eventos.json", label: "Eventos", module: "eventos" },
  { id: "cadastros", key: "cadastros", file: "cadastros.json", label: "Cadastros", module: "cadastros" },
  { id: "compromissos", key: "compromissos", file: "compromissos.json", label: "Compromissos", module: "eventos" },
  { id: "logistica", key: "logistica", file: "logistica.json", label: "Logística", module: "logistica" },
  { id: "mao_de_obra", key: "mao_de_obra", file: "mao-de-obra.json", label: "Mão de obra", module: "cadastros" },
  {
    id: "contas_a_receber",
    key: "contas_a_receber",
    file: "contas-a-receber.json",
    label: "Contas a receber",
    module: "financeiro",
  },
  {
    id: "fichas_tecnicas",
    key: "fichas_tecnicas",
    file: "fichas-tecnicas.json",
    label: "Fichas técnicas",
    module: "cozinha",
  },
  { id: "veiculos_uso", key: "veiculos_uso", file: "veiculos-uso.json", label: "Uso de veículos", module: "veiculos" },
  {
    id: "cozinha_insumos",
    key: "cozinha_insumos",
    file: "cozinha-insumos.json",
    label: "Estoque de insumos",
    module: "cozinha",
  },
] as const;

export type VersionedStoreId = (typeof VERSIONED_STORES)[number]["id"];

export type StateRevision<T = unknown> = {
  id: string;
  at: string;
  blobUpdatedAt: string | null;
  value: T;
};

export type RevisionSummary = {
  id: string;
  at: string;
  blobUpdatedAt: string | null;
};

type RevisionFile<T> = { revisions: Array<StateRevision<T>> };

const MAX_REVISIONS = 12;
const MAX_BYTES = 1_800_000;

export function findVersionedStore(id: string) {
  return VERSIONED_STORES.find((item) => item.id === id) ?? null;
}

function historyKey(key: string) {
  return `${key}__revs`;
}

function historyFile(fileName: string) {
  return `revs-${fileName}`;
}

async function readRevisionFile<T>(key: string, fileName: string): Promise<RevisionFile<T>> {
  const stored = await readState<Partial<RevisionFile<T>>>(historyKey(key), historyFile(fileName));
  if (!stored || !Array.isArray(stored.revisions)) return { revisions: [] };
  return {
    revisions: stored.revisions.filter((item): item is StateRevision<T> => Boolean(item?.id && item.at)),
  };
}

export async function appendRevision<T>(
  key: string,
  fileName: string,
  previous: T,
  blobUpdatedAt: string | null,
): Promise<void> {
  try {
    const encoded = JSON.stringify(previous);
    if (encoded.length > MAX_BYTES) return;
    const current = await readRevisionFile<T>(key, fileName);
    const latest = current.revisions[0];
    if (latest && stableEqual(latest.value, previous)) return;
    const next: RevisionFile<T> = {
      revisions: [
        { id: uid(), at: new Date().toISOString(), blobUpdatedAt, value: previous },
        ...current.revisions,
      ].slice(0, MAX_REVISIONS),
    };
    await writeState(historyKey(key), historyFile(fileName), next);
  } catch (error) {
    console.error(`Falha ao gravar histórico (${key})`, error);
  }
}

export async function listRevisions(key: string, fileName: string): Promise<RevisionSummary[]> {
  const { revisions } = await readRevisionFile(key, fileName);
  return revisions.map(({ id, at, blobUpdatedAt }) => ({ id, at, blobUpdatedAt }));
}

export async function getRevision<T>(key: string, fileName: string, id: string): Promise<StateRevision<T> | null> {
  const { revisions } = await readRevisionFile<T>(key, fileName);
  return revisions.find((item) => item.id === id) ?? null;
}
