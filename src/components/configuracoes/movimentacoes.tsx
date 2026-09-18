"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, EmptyBlock, LoadingBlock } from "@/components/cadastros/ui";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS, type AuditEntry } from "@/lib/auditoria/types";
import { formatDateTime } from "@/lib/dates";
import { APP_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const ACTION_CLASS: Record<string, string> = {
  criar: "bg-forest/10 text-forest",
  editar: "bg-amber-100 text-amber-800",
  excluir: "bg-terracotta/10 text-terracotta",
};

export function MovimentacoesAdmin() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auditoria", { cache: "no-store" });
        const json = (await res.json()) as { data?: { entries?: AuditEntry[] }; error?: string };
        if (!res.ok) throw new Error(json.error || "load");
        if (active) setEntries(json.data?.entries ?? []);
      } catch {
        if (active) toast.error("Não foi possível carregar as movimentações.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const modules = useMemo(() => {
    const labels = new Map(APP_MODULES.map((item) => [item.id, item.label]));
    const ids = [...new Set(entries.map((item) => item.module).filter(Boolean))];
    return ids.map((id) => ({ id, label: labels.get(id) ?? id }));
  }, [entries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((item) => {
      if (moduleFilter && item.module !== moduleFilter) return false;
      if (actionFilter && item.action !== actionFilter) return false;
      if (!term) return true;
      return `${item.summary} ${item.userName} ${item.entity}`.toLowerCase().includes(term);
    });
  }, [entries, moduleFilter, actionFilter, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Configurações do Sistema"
        title="Registro de movimentações"
        description="Auditoria do que foi criado, editado ou excluído no sistema."
      />
      {!ready ? (
        <LoadingBlock />
      ) : entries.length === 0 ? (
        <EmptyBlock
          title="Nenhuma movimentação"
          description="As alterações feitas daqui em diante aparecem nesta lista."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por registro, pessoa ou entidade…"
              className="h-10 flex-1 rounded-lg border border-forest/15 bg-white px-3 text-sm"
            />
            <select
              className="h-10 rounded-lg border border-forest/15 bg-white px-3 text-sm"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
            >
              <option value="">Todos os módulos</option>
              {modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-forest/15 bg-white px-3 text-sm"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              <option value="">Todas as ações</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </div>
          {filtered.length === 0 ? (
            <EmptyBlock title="Nenhum resultado" description="Ajuste os filtros da auditoria." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="field-label py-3 pl-5 font-normal">Quando</th>
                    <th className="field-label py-3 font-normal">Quem</th>
                    <th className="field-label py-3 font-normal">Ação</th>
                    <th className="field-label py-3 pr-5 font-normal">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-forest/5 last:border-0">
                      <td className="py-3 pl-5 whitespace-nowrap text-forest/60">{formatDateTime(item.at)}</td>
                      <td className="py-3 text-forest/70">{item.userName}</td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs",
                            ACTION_CLASS[item.action] ?? "bg-forest/8 text-forest/70",
                          )}
                        >
                          {AUDIT_ACTION_LABELS[item.action] ?? item.action}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-forest">{item.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
