"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/event-factory";
import { UNIFORM_SIZE_LABELS } from "@/lib/labels";
import {
  emptyWorkerUniformSizes,
  LABOR_FUNCTIONS,
  WORKER_SEX_LABELS,
  WORKER_SEXES,
  type ExternalWorker,
  type LaborRate,
  type WorkerOccurrence,
  type WorkerOccurrenceType,
  type WorkerSex,
  type WorkerUniformSizes,
} from "@/lib/mao-de-obra/types";
import { UNIFORM_PIECES, UNIFORM_SIZES, type UniformSize } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MaoDeObraAdmin() {
  const { data, ready, upsertWorker, removeWorker, setRates } = useMaoDeObra();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ExternalWorker | null>(null);
  const [open, setOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);

  const workers = useMemo(() => {
    const list = [...(data?.workers ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.cpf.toLowerCase().includes(term) ||
        item.pix.toLowerCase().includes(term),
    );
  }, [data?.workers, search]);

  const stats = useMemo(() => {
    const list = data?.workers ?? [];
    return {
      total: list.length,
      men: list.filter((item) => item.sex === "masculino").length,
      women: list.filter((item) => item.sex === "feminino").length,
    };
  }, [data?.workers]);

  const rates = data?.rates ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <CadastrosHeader
        eyebrow="Cadastros"
        title="Cadastro de equipe externa"
        action={
          <Button
            className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Novo prestador
          </Button>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastro indisponível" description="Recarregue a página." />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Profissionais cadastrados" value={stats.total} />
            <StatCard label="Homens" value={stats.men} />
            <StatCard label="Mulheres" value={stats.women} />
          </section>

          <section className="space-y-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, CPF ou PIX…" />
            {workers.length === 0 ? (
              <EmptyBlock
                title="Nenhum prestador"
                action={
                  <Button
                    className="bg-forest text-cream hover:bg-petrol"
                    onClick={() => {
                      setEditing(null);
                      setOpen(true);
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    Novo prestador
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-forest/10">
                      <th className="field-label py-3 pl-5 font-normal">Nome</th>
                      <th className="field-label py-3 font-normal">Sexo</th>
                      <th className="field-label py-3 font-normal">Fardas</th>
                      <th className="field-label py-3 font-normal">Ocorrências</th>
                      <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((item) => {
                      const positives = item.occurrences.filter((row) => row.type === "positivo").length;
                      const negatives = item.occurrences.filter((row) => row.type === "negativo").length;
                      return (
                        <tr key={item.id} className="border-b border-forest/5 last:border-0">
                          <td className="py-3 pl-5 font-medium text-forest">
                            {item.name}
                            <p className="text-xs font-light text-forest/45">{item.cpf || "sem CPF"}</p>
                          </td>
                          <td className="py-3 text-forest/70">
                            {item.sex ? WORKER_SEX_LABELS[item.sex] : "—"}
                          </td>
                          <td className="py-3 text-forest/70">{uniformSummary(item.uniformSizes)}</td>
                          <td className="py-3 text-forest/70">
                            {positives || negatives ? `${positives} + · ${negatives} −` : "—"}
                          </td>
                          <td className="py-3 pr-5 text-right">
                            <button
                              type="button"
                              className="text-sm text-forest/60 hover:text-forest"
                              onClick={() => {
                                setEditing(item);
                                setOpen(true);
                              }}
                            >
                              Editar
                            </button>
                            <span className="mx-2 text-forest/20">·</span>
                            <button
                              type="button"
                              className="text-sm text-terracotta/80 hover:text-terracotta"
                              onClick={() => {
                                if (window.confirm(`Excluir "${item.name}"?`)) {
                                  removeWorker(item.id);
                                  toast.success("Prestador excluído.");
                                }
                              }}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-forest/10 bg-white p-5 sm:p-6">
            <button
              type="button"
              aria-expanded={ratesOpen}
              onClick={() => setRatesOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h2 className="text-[15px] font-semibold text-forest">Tabela de valores</h2>
              <ChevronDown
                className={cn("size-4 shrink-0 text-forest/40 transition-transform", ratesOpen && "rotate-180")}
              />
            </button>
            {ratesOpen ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-forest/10">
                      <th className="field-label py-2 font-normal">Função</th>
                      <th className="field-label py-2 font-normal">Diária</th>
                      <th className="field-label py-2 font-normal">Hora extra</th>
                      <th className="field-label py-2 font-normal">Ajuda de custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LABOR_FUNCTIONS.map((role) => {
                      const rate = rates.find((item) => item.functionKey === role.key) ?? {
                        functionKey: role.key,
                        daily: 0,
                        overtimeHourly: 0,
                        allowance: 0,
                      };
                      const update = (patch: Partial<LaborRate>) => {
                        const next = rates.some((item) => item.functionKey === role.key)
                          ? rates.map((item) => (item.functionKey === role.key ? { ...item, ...patch } : item))
                          : [...rates, { ...rate, ...patch }];
                        setRates(next);
                      };
                      return (
                        <tr key={role.key} className="border-b border-forest/5 last:border-0">
                          <td className="py-2 pr-3 text-forest">{role.label}</td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              className={cn(fieldControlClass, "h-9")}
                              value={rate.daily || ""}
                              onChange={(event) => update({ daily: Number(event.target.value) || 0 })}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              className={cn(fieldControlClass, "h-9")}
                              value={rate.overtimeHourly || ""}
                              onChange={(event) => update({ overtimeHourly: Number(event.target.value) || 0 })}
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              className={cn(fieldControlClass, "h-9")}
                              value={rate.allowance || ""}
                              onChange={(event) => update({ allowance: Number(event.target.value) || 0 })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm font-light text-forest/50">Minimizada. Abra para editar diárias e ajuda de custo.</p>
            )}
          </section>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar prestador" : "Novo prestador"}>
        <WorkerForm
          key={editing?.id ?? "new"}
          initial={editing}
          onCancel={() => setOpen(false)}
          onSubmit={(worker) => {
            upsertWorker(worker);
            toast.success(editing ? "Prestador atualizado." : "Prestador cadastrado.");
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-forest/10 bg-white px-4 py-3">
      <p className="text-[12px] font-medium text-forest/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-forest">{value}</p>
    </div>
  );
}

function uniformSummary(sizes: WorkerUniformSizes) {
  const parts = UNIFORM_PIECES.map((piece) => {
    const size = sizes[piece.key];
    return size ? `${piece.label} ${UNIFORM_SIZE_LABELS[size]}` : null;
  }).filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function WorkerForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: ExternalWorker | null;
  onSubmit: (worker: ExternalWorker) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cpf, setCpf] = useState(initial?.cpf ?? "");
  const [pix, setPix] = useState(initial?.pix ?? "");
  const [sex, setSex] = useState<WorkerSex>(initial?.sex ?? "");
  const [uniformSizes, setUniformSizes] = useState<WorkerUniformSizes>(
    initial?.uniformSizes ?? emptyWorkerUniformSizes(),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [occurrences, setOccurrences] = useState<WorkerOccurrence[]>(initial?.occurrences ?? []);
  const [occType, setOccType] = useState<WorkerOccurrenceType>("positivo");
  const [occNote, setOccNote] = useState("");

  return (
    <div className="space-y-5">
      <Field label="Nome">
        <input className={fieldControlClass} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF">
          <input className={fieldControlClass} value={cpf} onChange={(event) => setCpf(event.target.value)} />
        </Field>
        <Field label="PIX">
          <input className={fieldControlClass} value={pix} onChange={(event) => setPix(event.target.value)} />
        </Field>
      </div>
      <Field label="Sexo">
        <select className={fieldControlClass} value={sex} onChange={(event) => setSex(event.target.value as WorkerSex)}>
          <option value="">Não informado</option>
          {WORKER_SEXES.map((item) => (
            <option key={item} value={item}>
              {WORKER_SEX_LABELS[item]}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <p className="field-label mb-2">Tamanho da farda</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNIFORM_PIECES.map((piece) => (
            <Field key={piece.key} label={piece.label}>
              <select
                className={fieldControlClass}
                value={uniformSizes[piece.key]}
                onChange={(event) =>
                  setUniformSizes((current) => ({
                    ...current,
                    [piece.key]: (event.target.value || "") as UniformSize | "",
                  }))
                }
              >
                <option value="">—</option>
                {UNIFORM_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {UNIFORM_SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
      </div>
      <Field label="Observações">
        <textarea className={cn(fieldControlClass, "min-h-20 py-2")} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="rounded-xl border border-forest/10 p-3">
        <p className="mb-3 text-sm font-semibold text-forest">Ocorrências</p>
        {occurrences.length === 0 ? (
          <p className="mb-3 text-sm font-light text-forest/50">Nenhuma ocorrência registrada.</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {occurrences.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 rounded-lg bg-cream/70 px-3 py-2">
                <div>
                  <p className={cn("text-xs font-medium", item.type === "positivo" ? "text-forest" : "text-terracotta")}>
                    {item.type === "positivo" ? "Positiva" : "Negativa"}
                  </p>
                  <p className="text-sm text-forest/80">{item.note}</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-forest/40 hover:text-terracotta"
                  onClick={() => setOccurrences((current) => current.filter((row) => row.id !== item.id))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
          <select
            className={fieldControlClass}
            value={occType}
            onChange={(event) => setOccType(event.target.value as WorkerOccurrenceType)}
          >
            <option value="positivo">Positiva</option>
            <option value="negativo">Negativa</option>
          </select>
          <input
            className={fieldControlClass}
            value={occNote}
            onChange={(event) => setOccNote(event.target.value)}
            placeholder="Descreva a ocorrência"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              if (!occNote.trim()) {
                toast.error("Descreva a ocorrência.");
                return;
              }
              setOccurrences((current) => [
                {
                  id: uid(),
                  type: occType,
                  note: occNote.trim(),
                  createdAt: new Date().toISOString(),
                },
                ...current,
              ]);
              setOccNote("");
            }}
          >
            Registrar
          </Button>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-forest/10 pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="h-10 bg-forest px-5 text-cream hover:bg-petrol"
          onClick={() => {
            if (!name.trim()) {
              toast.error("Informe o nome.");
              return;
            }
            const stamp = new Date().toISOString();
            onSubmit({
              id: initial?.id ?? uid(),
              name: name.trim(),
              cpf: cpf.trim(),
              pix: pix.trim(),
              bankAccount: initial?.bankAccount ?? "",
              functionKey: initial?.functionKey ?? "",
              functionKeys: initial?.functionKeys ?? [],
              sex,
              uniformSizes,
              occurrences,
              notes: notes.trim(),
              createdAt: initial?.createdAt ?? stamp,
              updatedAt: stamp,
            });
          }}
        >
          {initial ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </div>
  );
}
