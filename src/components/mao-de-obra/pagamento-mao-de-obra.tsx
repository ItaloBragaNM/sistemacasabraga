"use client";

import { FileDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, EmptyBlock, LoadingBlock, SearchInput } from "@/components/cadastros/ui";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/crm/format";
import { formatLongDate } from "@/lib/dates";
import { slugify } from "@/lib/download";
import { groupLaborPaymentsByEvent } from "@/lib/mao-de-obra/calc";
import { downloadContaAzulSheet } from "@/lib/mao-de-obra/conta-azul";
import type { LaborPayment } from "@/lib/mao-de-obra/types";
import { cn } from "@/lib/utils";

export function PagamentoMaoDeObraPage() {
  const { data, ready } = useMaoDeObra();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [working, setWorking] = useState(false);

  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);
  const groups = useMemo(() => groupLaborPaymentsByEvent(payments), [payments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => {
      const haystack = [
        group.eventCode,
        group.eventTitle,
        ...group.payments.map((item) => `${item.workerName} ${item.functionLabel}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [groups, search]);

  const visibleIds = filtered.map((group) => group.eventId);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggle = (eventId: string) => {
    setSelected((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
  };

  const toggleAllVisible = () => {
    setSelected((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return [...new Set([...current, ...visibleIds])];
    });
  };

  const paymentsFor = (eventIds: string[]) =>
    payments.filter((item) => eventIds.includes(item.eventId));

  const exportSheet = async (rows: LaborPayment[], fileName: string) => {
    if (rows.length === 0) {
      toast.error("Selecione ao menos um evento.");
      return;
    }
    try {
      setWorking(true);
      await downloadContaAzulSheet(rows, fileName);
      toast.success("Planilha pronta para importar no Conta Azul.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar a planilha.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Financeiro"
        title="Pagamento de mão de obra"
        action={
          <Button
            className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
            disabled={working || (selectedVisible.length === 0 && filtered.length === 0)}
            onClick={() => {
              const ids = selectedVisible.length ? selectedVisible : visibleIds;
              const rows = paymentsFor(ids);
              const fileName =
                ids.length === 1
                  ? `conta-azul-mao-de-obra-${slugify(rows[0]?.eventCode || "evento")}`
                  : "conta-azul-mao-de-obra";
              void exportSheet(rows, fileName);
            }}
          >
            <FileDown data-icon="inline-start" />
            {selectedVisible.length > 0
              ? `Baixar ${selectedVisible.length} evento${selectedVisible.length === 1 ? "" : "s"}`
              : "Baixar planilha"}
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : payments.length === 0 ? (
        <EmptyBlock
          title="Nenhum pagamento gerado"
          description="Alocar prestadores na ficha do evento cria automaticamente os lançamentos nesta tela."
        />
      ) : (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por evento ou prestador…" />
          {filtered.length === 0 ? (
            <EmptyBlock title="Nenhum evento encontrado" description="Ajuste a busca." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-forest/10 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="w-10 py-3 pl-4">
                      <input
                        type="checkbox"
                        className="size-4 accent-forest"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        aria-label="Selecionar todos os eventos visíveis"
                      />
                    </th>
                    <th className="field-label py-3 font-normal">Evento</th>
                    <th className="field-label py-3 font-normal">Equipe</th>
                    <th className="field-label py-3 font-normal">Hora extra</th>
                    <th className="field-label py-3 font-normal">Ajuda de custo</th>
                    <th className="field-label py-3 font-normal">Total do evento</th>
                    <th className="w-12 py-3 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((group) => {
                    const checked = selected.includes(group.eventId);
                    return (
                      <tr key={group.eventId} className="border-b border-forest/5 last:border-0">
                        <td className="py-3 pl-4 align-top">
                          <input
                            type="checkbox"
                            className="size-4 accent-forest"
                            checked={checked}
                            onChange={() => toggle(group.eventId)}
                            aria-label={`Selecionar ${group.eventTitle || group.eventCode}`}
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-medium text-forest">{group.eventTitle || group.eventCode}</p>
                          <p className="text-xs font-light text-forest/45">
                            {group.eventCode}
                            {group.eventDate ? ` · ${formatLongDate(group.eventDate)}` : ""}
                            {` · ${group.payments.length} prestador${group.payments.length === 1 ? "" : "es"}`}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-forest">{formatBRL(group.teamAmount)}</td>
                        <td className="py-3 pr-3 text-forest">{formatBRL(group.overtimeAmount)}</td>
                        <td className="py-3 pr-3 text-forest">{formatBRL(group.allowanceAmount)}</td>
                        <td className="py-3 pr-3 font-medium text-forest">{formatBRL(group.total)}</td>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            className={cn(
                              "flex size-8 items-center justify-center rounded-lg text-forest/50 hover:bg-forest/8 hover:text-forest",
                            )}
                            aria-label={`Baixar planilha de ${group.eventTitle || group.eventCode}`}
                            disabled={working}
                            onClick={() =>
                              void exportSheet(
                                group.payments,
                                `conta-azul-mao-de-obra-${slugify(group.eventCode || group.eventTitle || "evento")}`,
                              )
                            }
                          >
                            <FileDown className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
