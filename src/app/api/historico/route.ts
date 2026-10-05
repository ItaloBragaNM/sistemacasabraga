import { NextResponse } from "next/server";
import { requireModule, requireSession } from "@/lib/auth/server";
import { saveStoreState } from "@/lib/store/cas.server";
import { readStateMeta } from "@/lib/store/kv.server";
import {
  findVersionedStore,
  getRevision,
  listRevisions,
  VERSIONED_STORES,
  type VersionedStoreId,
} from "@/lib/store/revisions.server";
import { canAccessModule } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { user, error } = await requireModule("configuracoes");
  if (error) return error;
  try {
    const stores = await Promise.all(
      VERSIONED_STORES.filter((store) => canAccessModule(user!.role, store.module)).map(async (store) => ({
        id: store.id,
        label: store.label,
        revisions: await listRevisions(store.key, store.file),
      })),
    );
    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Falha ao ler o histórico de versões", error);
    return NextResponse.json({ error: "Não foi possível carregar o histórico de versões." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  if (!user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  let payload: { store?: string; revisionId?: string };
  try {
    payload = (await request.json()) as { store?: string; revisionId?: string };
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const store = findVersionedStore(payload.store ?? "");
  if (!store || !payload.revisionId) {
    return NextResponse.json({ error: "Versão inválida." }, { status: 400 });
  }
  if (!canAccessModule(user.role, "configuracoes") && !canAccessModule(user.role, store.module)) {
    return NextResponse.json({ error: "Você não tem acesso a este módulo." }, { status: 403 });
  }

  try {
    const revision = await getRevision(store.key, store.file, payload.revisionId);
    if (!revision) {
      return NextResponse.json({ error: "Essa versão não está mais disponível." }, { status: 404 });
    }
    const current = await readStateMeta(store.key, store.file);
    const revive = (raw: unknown) => raw;
    let saved = await saveStoreState(store.key, store.file, revision.value, current.updatedAt, revive);
    if (saved.conflict) {
      saved = await saveStoreState(store.key, store.file, revision.value, saved.updatedAt, revive);
    }
    if (saved.conflict) {
      return NextResponse.json(
        { error: "Os dados mudaram de novo. Tente restaurar outra vez." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, store: store.id as VersionedStoreId, updatedAt: saved.updatedAt });
  } catch (error) {
    console.error("Falha ao restaurar versão", error);
    return NextResponse.json({ error: "Não foi possível restaurar essa versão." }, { status: 500 });
  }
}
