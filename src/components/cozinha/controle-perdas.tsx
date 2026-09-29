"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useCozinhaInsumos } from "@/components/cozinha/cozinha-insumos-provider";
import { downloadLossRegisterPdf } from "@/components/cozinha/perdas-pdf";
import { fieldControlClass, Field } from "@/components/events/field";
import { DateSortSelect, compareDateSort, type DateSort } from "@/components/date-sort";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { KpiCard, StatusPill } from "@/components/ui/status-pill";
import type { InsumoRecord } from "@/lib/cadastros/types";
import { LOSS_REASONS, lossReasonLabel, type InsumoLoss } from "@/lib/cozinha/types";
import { formatBRL, formatDecimal } from "@/lib/crm/format";
import { formatShortDate } from "@/lib/dates";
import { uid } from "@/lib/event-factory";
import { cn } from "@/lib/utils";

export function ControlePerdas() {
  const { data: cadastros, ready: cadReady } = useCadastros();
  const { data, ready: stockReady, addLoss, removeLoss } = useCozinhaInsumos();
  const [open, setOpen] = useState(false);
  const [reasonFilter, setReasonFilter] = useState("");
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const [workingPdf, setWorkingPdf] = useState(false);

  const insumoById = useMemo(
    () => new Map((cadastros?.insumos ?? []).map((item) => [item.id, item])),
    [cadastros],
  );

  const losses = useMemo(() => {
    const list = [...(data?.losses ?? [])].sort((a, b) => compareDateSort(a.date, b.date, dateSort));
    return reasonFilter ? list.filter((item) => item.reason === reasonFilter) : list;
  }, [data?.losses, reasonFilter, dateSort]);

  const totalCost = losses.reduce((sum, loss) => sum + lossCost(loss), 0);
  const month = monthKey();
  const monthLosses = (data?.losses ?? []).filter((item) => (item.date || "").slice(0, 7) === month);
  const ready = cadReady && stockReady;

  return (
    <PageShell
      eyebrow="Cozinha"
      title="Registro de Desperdícios"
      actions={
        <>
            <Button
              variant="outline"
              className="px-4"
              disabled={workingPdf}
              onClick={async () => {
                try {
                  setWorkingPdf(true);
                  await downloadLossRegisterPdf();
                  toast.success("Ficha de desperdícios baixada.");
                } catch (error) {
                  console.error(error);
                  toast.error("Não foi possível gerar o PDF.");
                } finally {
                  setWorkingPdf(false);
                }
              }}
            >
              <FileDown data-icon="inline-start" />
              Ficha para registro
            </Button>
            <Button
              className="px-5"
              disabled={!cadastros || cadastros.insumos.length === 0}
              onClick={() => setOpen(true)}
            >
              <Plus data-icon="inline-start" />
              Registrar desperdício
            </Button>
        </>
      }
    >

      {!ready ? (
        <LoadingBlock />
      ) : !cadastros || !data ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : cadastros.insumos.length === 0 ? (
        <EmptyBlock
          title="Nenhum insumo cadastrado"
          description="Cadastre insumos em Cadastros → Insumos para registrar desperdícios."
        />
      ) : (
        <>
          <LossDashboard losses={monthLosses} insumoById={insumoById} month={month} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Motivo"
                className={cn(fieldControlClass, "h-10 w-full sm:w-56")}
                value={reasonFilter}
                onChange={(event) => setReasonFilter(event.target.value)}
              >
                <option value="">Todos os motivos</option>
                {LOSS_REASONS.map((reason) => (
                  <option key={reason.key} value={reason.key}>
                    {reason.label}
                  </option>
                ))}
              </select>
              <DateSortSelect value={dateSort} onChange={setDateSort} />
            </div>
            <StatusPill className="h-8 px-3 text-sm">
              Neste filtro: <span className="ml-1 tabular">{formatBRL(totalCost)}</span>
            </StatusPill>
          </div>

          {losses.length === 0 ? (
            <EmptyBlock
              title="Nenhum desperdício registrado"
              description="Os desperdícios de insumos aparecem aqui e baixam o estoque automaticamente."
            />
          ) : (
            <Card flush>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="field-label py-3 pl-5 font-normal">Data</th>
                    <th className="field-label py-3 font-normal">Insumo</th>
                    <th className="field-label py-3 font-normal">Motivo</th>
                    <th className="field-label py-3 text-right font-normal">Quantidade</th>
                    <th className="field-label py-3 text-right font-normal">Custo</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {losses.map((loss) => {
                    const insumo = insumoById.get(loss.insumoId);
                    return (
                      <tr key={loss.id} className="border-b border-line last:border-0 align-middle">
                        <td className="py-3 pl-5 tabular text-forest/60">{formatShortDate(loss.date)}</td>
                        <td className="py-3">
                          <p className="text-forest">{insumo?.name ?? "Insumo removido"}</p>
                          {loss.note ? <p className="meta-text">{loss.note}</p> : null}
                        </td>
                        <td className="py-3">
                          <StatusPill>{lossReasonLabel(loss.reason)}</StatusPill>
                        </td>
                        <td className="py-3 text-right tabular text-forest/70">
                          {formatDecimal(loss.quantity, 2)} {insumo?.unit ?? ""}
                        </td>
                        <td className="py-3 text-right tabular text-danger">{formatBRL(loss.quantity * (loss.unitCost || 0))}</td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            type="button"
                            aria-label="Excluir desperdício"
                            className="inline-flex size-8 items-center justify-center rounded-md text-forest/35 hover:text-danger"
                            onClick={() => {
                              if (window.confirm("Excluir este desperdício? O estoque será estornado.")) {
                                removeLoss(loss.id);
                                toast.success("Desperdício excluído e estoque estornado.");
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </Card>
          )}
        </>
      )}

      {open && cadastros ? (
        <Modal open onClose={() => setOpen(false)} title="Registrar desperdício">
          <LossForm
            insumos={cadastros.insumos}
            onCancel={() => setOpen(false)}
            onSubmit={(loss) => {
              addLoss(loss);
              toast.success("Desperdício registrado. Estoque baixado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}

function lossCost(loss: InsumoLoss) {
  return loss.quantity * (loss.unitCost || 0);
}

function monthKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
}

function monthTitle(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  return format(parseISO(`${month}-01`), "MMMM yyyy", { locale: ptBR });
}

function LossDashboard({
  losses,
  insumoById,
  month,
}: {
  losses: InsumoLoss[];
  insumoById: Map<string, InsumoRecord>;
  month: string;
}) {
  const total = losses.reduce((sum, loss) => sum + lossCost(loss), 0);
  const byReason = LOSS_REASONS.map((reason) => ({
    label: reason.label,
    cost: losses.filter((loss) => loss.reason === reason.key).reduce((sum, loss) => sum + lossCost(loss), 0),
  }))
    .filter((item) => item.cost > 0)
    .sort((a, b) => b.cost - a.cost);
  const byInsumo = [...losses.reduce((map, loss) => {
    const current = map.get(loss.insumoId) ?? 0;
    map.set(loss.insumoId, current + lossCost(loss));
    return map;
  }, new Map<string, number>())]
    .map(([id, cost]) => ({ id, name: insumoById.get(id)?.name ?? "Insumo removido", cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
  const topReason = byReason[0];
  const topInsumo = byInsumo[0];
  const maxReason = byReason[0]?.cost ?? 0;

  return (
    <section className="space-y-3">
      <h2 className="section-title capitalize">{monthTitle(month)}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Custo do mês" value={formatBRL(total)} tone={total > 0 ? "danger" : "neutral"} />
        <KpiCard label="Registros" value={String(losses.length)} />
        <KpiCard
          className="min-w-0"
          label="Principal motivo"
          value={<span className="block truncate">{topReason?.label ?? "—"}</span>}
          hint={topReason ? formatBRL(topReason.cost) : undefined}
        />
        <KpiCard
          className="min-w-0"
          label="Insumo que mais pesou"
          value={<span className="block truncate">{topInsumo?.name ?? "—"}</span>}
          hint={topInsumo ? formatBRL(topInsumo.cost) : undefined}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h3 className="section-title">Por motivo</h3>
          {byReason.length === 0 ? (
            <p className="meta-text mt-3">Nenhum desperdício neste mês.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {byReason.map((item) => (
                <li key={item.label}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-forest">{item.label}</span>
                    <span className="shrink-0 tabular text-forest/70">{formatBRL(item.cost)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-forest/8">
                    <div
                      className="h-1.5 rounded-full bg-danger/80"
                      style={{ width: `${maxReason > 0 ? Math.max(6, (item.cost / maxReason) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="section-title">Insumos com maior custo</h3>
          {byInsumo.length === 0 ? (
            <p className="meta-text mt-3">Nenhum desperdício neste mês.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {byInsumo.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-forest">{item.name}</span>
                  <span className="shrink-0 tabular text-forest/70">{formatBRL(item.cost)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

function LossForm({
  insumos,
  onSubmit,
  onCancel,
}: {
  insumos: InsumoRecord[];
  onSubmit: (loss: InsumoLoss) => void;
  onCancel: () => void;
}) {
  const sorted = [...insumos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const [insumoId, setInsumoId] = useState(sorted[0]?.id ?? "");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState<string>(LOSS_REASONS[0].key);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const insumo = sorted.find((item) => item.id === insumoId);

  return (
    <div className="space-y-5">
      <Field label="Insumo">
        <select className={fieldControlClass} value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
          {sorted.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Quantidade${insumo ? ` (${insumo.unit})` : ""}`}>
          <input
            type="number"
            min={0}
            step="0.01"
            className={fieldControlClass}
            value={quantity || ""}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </Field>
        <Field label="Data">
          <input type="date" className={fieldControlClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Motivo" className="sm:col-span-2">
          <select className={fieldControlClass} value={reason} onChange={(e) => setReason(e.target.value)}>
            {LOSS_REASONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Observação">
        <textarea className={cn(fieldControlClass, "min-h-20 py-2")} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {insumo ? (
        <p className="meta-text">
          Custo estimado: <span className="tabular">{formatBRL((quantity || 0) * (insumo.unitCost || 0))}</span>
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" className="px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="px-5"
          onClick={() => {
            if (!insumo) {
              toast.error("Selecione o insumo.");
              return;
            }
            if (!quantity || quantity <= 0) {
              toast.error("Informe a quantidade.");
              return;
            }
            onSubmit({
              id: uid(),
              insumoId: insumo.id,
              quantity: Math.abs(quantity),
              reason,
              note: note.trim(),
              date,
              unitCost: insumo.unitCost || 0,
              createdAt: new Date().toISOString(),
            });
          }}
        >
          Registrar desperdício
        </Button>
      </div>
    </div>
  );
}
