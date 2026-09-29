"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { fieldControlClass } from "@/components/events/field";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS, type AuditEntry } from "@/lib/auditoria/types";
import { auditPlace, auditRecordTitle } from "@/lib/auditoria/place";
import { formatDateTime } from "@/lib/dates";
import { APP_MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const ACTION_TONE: Record<string, StatusTone> = {
  criar: "ok",
  editar: "info",
  excluir: "danger",
};

export function MovimentacoesAdmin() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("desc");

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
    return entries
      .filter((item) => {
        if (item.entity === "conta a receber") return false;
        if (moduleFilter && item.module !== moduleFilter) return false;
        if (actionFilter && item.action !== actionFilter) return false;
        if (!term) return true;
        const place = auditPlace(item);
        return `${item.summary} ${item.userName} ${item.entity} ${place}`.toLowerCase().includes(term);
      })
      .sort((a, b) => compareDateSort(a.at, b.at, dateSort));
  }, [entries, moduleFilter, actionFilter, search, dateSort]);

  return (
    <PageShell
      eyebrow="Configurações do Sistema"
      title="Registro de movimentações"
      description="Cada linha mostra quem fez a alteração, em qual página ela aconteceu e qual registro foi criado, editado ou excluído."
    >
      {!ready ? (
        <LoadingBlock />
      ) : entries.length === 0 ? (
        <EmptyBlock
          title="Nenhuma movimentação"
          description="As alterações feitas daqui em diante aparecem nesta lista."
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="min-w-[180px] flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por pessoa, página ou registro…"
              />
            </div>
            <select
              className={cn(fieldControlClass, "h-10 w-full md:w-52")}
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              aria-label="Filtrar por módulo"
            >
              <option value="">Todos os módulos</option>
              {modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className={cn(fieldControlClass, "h-10 w-full md:w-44")}
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              aria-label="Filtrar por ação"
            >
              <option value="">Todas as ações</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
            <DateSortSelect value={dateSort} onChange={setDateSort} className="h-10" />
          </div>
          {filtered.length === 0 ? (
            <EmptyBlock title="Nenhum resultado" description="Ajuste a busca ou os filtros." />
          ) : (
            <Card flush className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="field-label py-3 pl-5 pr-3">Quando</th>
                    <th className="field-label py-3 pr-3">Quem</th>
                    <th className="field-label py-3 pr-3">Ação</th>
                    <th className="field-label py-3 pr-3">Onde</th>
                    <th className="field-label py-3 pr-5">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-line align-top last:border-0">
                      <td className="meta-text whitespace-nowrap py-3 pl-5 pr-3 tabular">
                        {formatDateTime(item.at)}
                      </td>
                      <td className="py-3 pr-3 text-forest">{item.userName}</td>
                      <td className="py-3 pr-3">
                        <StatusPill tone={ACTION_TONE[item.action] ?? "neutral"}>
                          {AUDIT_ACTION_LABELS[item.action] ?? item.action}
                        </StatusPill>
                      </td>
                      <td className="py-3 pr-3 font-medium text-forest">{auditPlace(item)}</td>
                      <td className="py-3 pr-5 text-forest/80">{auditRecordTitle(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}
