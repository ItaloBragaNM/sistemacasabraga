"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";

type StoreHistory = {
  id: string;
  label: string;
  revisions: Array<{ id: string; at: string }>;
};

export function VersoesSalvas() {
  const [stores, setStores] = useState<StoreHistory[]>([]);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/historico", { cache: "no-store" });
      const json = (await res.json()) as { stores?: StoreHistory[]; error?: string };
      if (!res.ok) throw new Error(json.error || "load");
      setStores(json.stores ?? []);
    } catch {
      toast.error("Não foi possível carregar o histórico de versões.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const restore = async (storeId: string, revisionId: string, at: string) => {
    if (
      !window.confirm(
        `Restaurar a versão de ${formatDateTime(at)}?\n\nA versão atual continua no histórico, caso precise voltar.`,
      )
    ) {
      return;
    }
    setWorking(revisionId);
    try {
      const res = await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: storeId, revisionId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "restore");
      toast.success("Versão restaurada. Recarregue as telas abertas em outros computadores.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível restaurar essa versão.");
    } finally {
      setWorking(null);
    }
  };

  const withHistory = stores.filter((store) => store.revisions.length > 0);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg text-forest">Versões salvas</h2>
        <p className="meta-text mt-1">
          Cada gravação guarda a versão anterior. Se duas pessoas editarem ao mesmo tempo, as alterações são unidas e o
          que seria sobrescrito fica aqui para restaurar.
        </p>
      </div>
      {!ready ? (
        <LoadingBlock />
      ) : withHistory.length === 0 ? (
        <EmptyBlock
          title="Nenhuma versão ainda"
          description="As próximas gravações passam a deixar histórico para desfazer uma sobrescrita."
        />
      ) : (
        <div className="space-y-4">
          {withHistory.map((store) => (
            <Card key={store.id} className="overflow-hidden p-0">
              <div className="border-b border-line px-5 py-3 font-medium text-forest">{store.label}</div>
              <ul className="divide-y divide-line">
                {store.revisions.map((revision, index) => (
                  <li key={revision.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm text-forest">{formatDateTime(revision.at)}</p>
                      <p className="meta-text">{index === 0 ? "Versão anterior à última gravação" : "Versão mais antiga"}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 shrink-0 px-3"
                      disabled={working === revision.id}
                      onClick={() => void restore(store.id, revision.id, revision.at)}
                    >
                      {working === revision.id ? "Restaurando…" : "Restaurar"}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
