"use client";

import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { SortableTh, compareSort, useColumnSort } from "@/components/cadastros/sort-header";
import { fieldControlClass, Field } from "@/components/events/field";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented";
import { KpiCard, StatusPill } from "@/components/ui/status-pill";
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
  const [sexFilter, setSexFilter] = useState<"todos" | Exclude<WorkerSex, "">>("todos");
  const [editing, setEditing] = useState<ExternalWorker | null>(null);
  const [open, setOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const sort = useColumnSort<"name" | "sex" | "uniforms" | "occurrences">("name");

  const workers = useMemo(() => {
    const list = [...(data?.workers ?? [])].sort((a, b) => {
      const occurrences = (worker: ExternalWorker) => worker.occurrences.length;
      const value = {
        name: a.name,
        sex: a.sex ? WORKER_SEX_LABELS[a.sex] : "",
        uniforms: uniformSummary(a.uniformSizes),
        occurrences: occurrences(a),
      }[sort.key];
      const other = {
        name: b.name,
        sex: b.sex ? WORKER_SEX_LABELS[b.sex] : "",
        uniforms: uniformSummary(b.uniformSizes),
        occurrences: occurrences(b),
      }[sort.key];
      return compareSort(value, other, sort.dir) || a.name.localeCompare(b.name, "pt-BR");
    });
    const term = search.trim().toLowerCase();
    return list.filter((item) => {
      if (sexFilter !== "todos" && item.sex !== sexFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.cpf.toLowerCase().includes(term) ||
        item.pix.toLowerCase().includes(term)
      );
    });
  }, [data?.workers, search, sexFilter, sort.key, sort.dir]);

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
    <PageShell>
      <CadastrosHeader
        eyebrow="Cadastros"
        title="Equipe Externa"
        action={
          <Button
            className="h-10 px-5"
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
            <KpiCard label="Profissionais cadastrados" value={stats.total} />
            <KpiCard label="Homens" value={stats.men} />
            <KpiCard label="Mulheres" value={stats.women} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[180px] flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, CPF ou PIX…" />
              </div>
              <SegmentedControl
                ariaLabel="Filtrar por sexo"
                value={sexFilter}
                onChange={setSexFilter}
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "masculino", label: "Homens" },
                  { value: "feminino", label: "Mulheres" },
                ]}
              />
            </div>
            {workers.length === 0 ? (
              <EmptyBlock
                title={search.trim() || sexFilter !== "todos" ? "Nenhum resultado" : "Nenhum prestador"}
                description={
                  search.trim() || sexFilter !== "todos"
                    ? "Ajuste a busca ou o filtro de sexo."
                    : undefined
                }
                action={
                  search.trim() || sexFilter !== "todos" ? undefined : (
                    <Button
                      className="h-10"
                      onClick={() => {
                        setEditing(null);
                        setOpen(true);
                      }}
                    >
                      <Plus data-icon="inline-start" />
                      Novo prestador
                    </Button>
                  )
                }
              />
            ) : (
              <Card flush className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <SortableTh label="Nome" active={sort.key === "name"} dir={sort.dir} onClick={() => sort.toggle("name")} className="pl-5" />
                      <SortableTh label="Sexo" active={sort.key === "sex"} dir={sort.dir} onClick={() => sort.toggle("sex")} />
                      <SortableTh label="Fardas" active={sort.key === "uniforms"} dir={sort.dir} onClick={() => sort.toggle("uniforms")} />
                      <SortableTh label="Ocorrências" active={sort.key === "occurrences"} dir={sort.dir} onClick={() => sort.toggle("occurrences")} />
                      <th className="field-label py-3 pr-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((item) => {
                      const positives = item.occurrences.filter((row) => row.type === "positivo").length;
                      const negatives = item.occurrences.filter((row) => row.type === "negativo").length;
                      return (
                        <tr key={item.id} className="border-b border-line last:border-0 hover:bg-forest/[0.02]">
                          <td className="py-3 pl-5 pr-3 font-medium text-forest">
                            {item.name}
                            <p className="meta-text mt-0.5 font-normal tabular">{item.cpf || "sem CPF"}</p>
                          </td>
                          <td className="py-3 pr-3 text-forest/70">
                            {item.sex ? WORKER_SEX_LABELS[item.sex] : "—"}
                          </td>
                          <td className="py-3 pr-3 text-forest/70">{uniformSummary(item.uniformSizes)}</td>
                          <td className="py-3 pr-3 text-forest/70 tabular">
                            {positives || negatives ? `${positives} + · ${negatives} −` : "—"}
                          </td>
                          <td className="py-3 pr-5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                aria-label={`Editar ${item.name}`}
                                className="flex size-8 items-center justify-center rounded-md text-forest/50 transition-colors hover:bg-forest/5 hover:text-forest"
                                onClick={() => {
                                  setEditing(item);
                                  setOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Excluir ${item.name}`}
                                className="flex size-8 items-center justify-center rounded-md text-forest/40 transition-colors hover:bg-danger/10 hover:text-danger"
                                onClick={() => {
                                  if (window.confirm(`Excluir "${item.name}"?`)) {
                                    removeWorker(item.id);
                                    toast.success("Prestador excluído.");
                                  }
                                }}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          <Card>
            <button
              type="button"
              aria-expanded={ratesOpen}
              onClick={() => setRatesOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h2 className="section-title">Tabela de valores</h2>
              <ChevronDown
                className={cn("size-4 shrink-0 text-forest/40 transition-transform", ratesOpen && "rotate-180")}
              />
            </button>
            {ratesOpen ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="field-label py-3 pr-3">Função</th>
                      <th className="field-label py-3 pr-3 text-right">Diária</th>
                      <th className="field-label py-3 pr-3 text-right">Hora extra</th>
                      <th className="field-label py-3 text-right">Ajuda de custo</th>
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
                        <tr key={role.key} className="border-b border-line last:border-0">
                          <td className="py-2 pr-3 text-forest">{role.label}</td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              aria-label={`Diária de ${role.label}`}
                              className={cn(fieldControlClass, rateInputClass)}
                              value={rate.daily || ""}
                              onChange={(event) => update({ daily: Number(event.target.value) || 0 })}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              aria-label={`Hora extra de ${role.label}`}
                              className={cn(fieldControlClass, rateInputClass)}
                              value={rate.overtimeHourly || ""}
                              onChange={(event) => update({ overtimeHourly: Number(event.target.value) || 0 })}
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              aria-label={`Ajuda de custo de ${role.label}`}
                              className={cn(fieldControlClass, rateInputClass)}
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
              <p className="meta-text mt-2">Minimizada. Abra para editar diárias e ajuda de custo.</p>
            )}
          </Card>
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
    </PageShell>
  );
}

const rateInputClass = "ml-auto block h-9 w-28 text-right tabular";

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
      <div className="rounded-lg border border-line bg-white p-4">
        <h3 className="section-title mb-3">Ocorrências</h3>
        {occurrences.length === 0 ? (
          <p className="meta-text mb-3">Nenhuma ocorrência registrada.</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {occurrences.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 rounded-md bg-cream px-3 py-2">
                <div className="min-w-0 space-y-1">
                  <StatusPill tone={item.type === "positivo" ? "ok" : "danger"}>
                    {item.type === "positivo" ? "Positiva" : "Negativa"}
                  </StatusPill>
                  <p className="text-sm text-forest/80">{item.note}</p>
                </div>
                <button
                  type="button"
                  className="meta-text shrink-0 hover:text-danger"
                  onClick={() => setOccurrences((current) => current.filter((row) => row.id !== item.id))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <SegmentedControl
            ariaLabel="Tipo de ocorrência"
            value={occType}
            onChange={setOccType}
            options={[
              { value: "positivo", label: "Positiva" },
              { value: "negativo", label: "Negativa" },
            ]}
          />
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
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" className="h-10 px-4" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          className="h-10 px-5"
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
