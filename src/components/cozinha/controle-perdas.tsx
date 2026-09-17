"use client";

import { FileDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import { CadastrosHeader, Chip, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { useCozinhaInsumos } from "@/components/cozinha/cozinha-insumos-provider";
import { downloadLossRegisterPdf } from "@/components/cozinha/perdas-pdf";
import { fieldControlClass, Field } from "@/components/events/field";
import { Button } from "@/components/ui/button";
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
  const [workingPdf, setWorkingPdf] = useState(false);

  const insumoById = useMemo(
    () => new Map((cadastros?.insumos ?? []).map((item) => [item.id, item])),
    [cadastros],
  );

  const losses = useMemo(() => {
    const list = [...(data?.losses ?? [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return reasonFilter ? list.filter((item) => item.reason === reasonFilter) : list;
  }, [data?.losses, reasonFilter]);

  const totalCost = losses.reduce((sum, loss) => sum + loss.quantity * (loss.unitCost || 0), 0);
  const ready = cadReady && stockReady;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        eyebrow="Cozinha"
        title="Controle de Perdas"
        description="Registre perdas de insumos. Cada perda baixa o estoque e soma no custo do desperdício. Imprima a ficha de 1 página para anotar na cozinha e lançar depois."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-10 px-4"
              disabled={workingPdf}
              onClick={async () => {
                try {
                  setWorkingPdf(true);
                  await downloadLossRegisterPdf();
                  toast.success("Ficha de perdas baixada.");
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
              className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
              disabled={!cadastros || cadastros.insumos.length === 0}
              onClick={() => setOpen(true)}
            >
              <Plus data-icon="inline-start" />
              Registrar perda
            </Button>
          </div>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !cadastros || !data ? (
        <EmptyBlock title="Módulo indisponível" description="Recarregue a página." />
      ) : cadastros.insumos.length === 0 ? (
        <EmptyBlock
          title="Nenhum insumo cadastrado"
          description="Cadastre insumos em Cadastros → Insumos para registrar perdas."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReasonFilter("")}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm",
                  reasonFilter === "" ? "border-forest bg-forest text-cream" : "border-forest/15 text-forest/70",
                )}
              >
                Todas
              </button>
              {LOSS_REASONS.map((reason) => (
                <button
                  key={reason.key}
                  type="button"
                  onClick={() => setReasonFilter(reason.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    reasonFilter === reason.key ? "border-forest bg-forest text-cream" : "border-forest/15 text-forest/70",
                  )}
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <span className="rounded-md bg-terracotta/10 px-3 py-1.5 text-sm text-terracotta">
              Desperdício: {formatBRL(totalCost)}
            </span>
          </div>

          {losses.length === 0 ? (
            <EmptyBlock
              title="Nenhuma perda registrada"
              description="As perdas de insumos aparecem aqui e baixam o estoque automaticamente."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="field-label py-3 pl-5 font-normal">Data</th>
                    <th className="field-label py-3 font-normal">Insumo</th>
                    <th className="field-label py-3 font-normal">Motivo</th>
                    <th className="field-label py-3 text-right font-normal">Qtd</th>
                    <th className="field-label py-3 text-right font-normal">Custo</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {losses.map((loss) => {
                    const insumo = insumoById.get(loss.insumoId);
                    return (
                      <tr key={loss.id} className="border-b border-forest/5 last:border-0">
                        <td className="py-3 pl-5 text-forest/60">{formatShortDate(loss.date)}</td>
                        <td className="py-3">
                          <p className="font-list text-forest">{insumo?.name ?? "Insumo removido"}</p>
                          {loss.note ? <p className="text-xs font-light text-forest/45">{loss.note}</p> : null}
                        </td>
                        <td className="py-3">
                          <Chip className="bg-forest/6 text-forest/70">{lossReasonLabel(loss.reason)}</Chip>
                        </td>
                        <td className="py-3 text-right tabular-nums text-forest/70">
                          {formatDecimal(loss.quantity, 2)} {insumo?.unit ?? ""}
                        </td>
                        <td className="py-3 text-right text-terracotta">{formatBRL(loss.quantity * (loss.unitCost || 0))}</td>
                        <td className="py-3 pr-5 text-right">
                          <button
                            type="button"
                            aria-label="Excluir perda"
                            className="inline-flex size-8 items-center justify-center text-forest/35 hover:text-terracotta"
                            onClick={() => {
                              if (window.confirm("Excluir esta perda? O estoque será estornado.")) {
                                removeLoss(loss.id);
                                toast.success("Perda excluída e estoque estornado.");
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
          )}
        </>
      )}

      {open && cadastros ? (
        <Modal open onClose={() => setOpen(false)} title="Registrar perda">
          <LossForm
            insumos={cadastros.insumos}
            onCancel={() => setOpen(false)}
            onSubmit={(loss) => {
              addLoss(loss);
              toast.success("Perda registrada. Estoque baixado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
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
        <p className="text-xs font-light text-forest/50">
          Custo estimado da perda: {formatBRL((quantity || 0) * (insumo.unitCost || 0))}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
          onClick={() => {
            if (!insumo) {
              toast.error("Selecione o insumo.");
              return;
            }
            if (!quantity || quantity <= 0) {
              toast.error("Informe a quantidade perdida.");
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
          Registrar perda
        </Button>
      </div>
    </div>
  );
}
