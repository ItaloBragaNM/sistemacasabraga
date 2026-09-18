"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CadastrosHeader, EmptyBlock, LoadingBlock, Modal, SearchInput } from "@/components/cadastros/ui";
import { fieldControlClass, Field } from "@/components/events/field";
import { useMaoDeObra } from "@/components/mao-de-obra/mao-de-obra-provider";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/event-factory";
import { LABOR_FUNCTIONS, laborFunctionLabel, workerFunctionKeys, workerFunctionsLabel, type ExternalWorker, type LaborRate } from "@/lib/mao-de-obra/types";
import { cn } from "@/lib/utils";

export function MaoDeObraAdmin() {
  const { data, ready, upsertWorker, removeWorker, setRates } = useMaoDeObra();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ExternalWorker | null>(null);
  const [open, setOpen] = useState(false);

  const workers = useMemo(() => {
    const list = [...(data?.workers ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.cpf.toLowerCase().includes(term) ||
        laborFunctionLabel(item.functionKey).toLowerCase().includes(term) ||
        workerFunctionsLabel(item).toLowerCase().includes(term),
    );
  }, [data?.workers, search]);

  const rates = data?.rates ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <CadastrosHeader
        eyebrow="Administrativo"
        title="Mão de obra externa"
        description="Cadastre prestadores e as funções que cada um pode exercer. Na ficha do evento, escolha a função daquele dia."
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
          <section className="rounded-2xl border border-forest/10 bg-white p-5 sm:p-6">
            <h2 className="font-section text-[0.82rem] text-forest">Tabela de valores</h2>
            <p className="mt-1 text-xs font-light text-forest/50">
              Diária, hora extra e ajuda de custo. A ajuda entra automaticamente quando o evento está fora da cidade.
            </p>
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
          </section>

          <section className="space-y-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, CPF ou função…" />
            {workers.length === 0 ? (
              <EmptyBlock
                title="Nenhum prestador"
                description="Cadastre uma vez. Depois a pessoa é só selecionada na ficha do evento."
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
                      <th className="field-label py-3 font-normal">CPF</th>
                      <th className="field-label py-3 font-normal">Funções</th>
                      <th className="field-label py-3 font-normal">PIX / conta</th>
                      <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((item) => (
                      <tr key={item.id} className="border-b border-forest/5 last:border-0">
                        <td className="py-3 pl-5 font-list font-medium text-forest">{item.name}</td>
                        <td className="py-3 font-mono text-forest/70">{item.cpf || "—"}</td>
                        <td className="py-3 text-forest/70">{workerFunctionsLabel(item)}</td>
                        <td className="py-3 text-forest/70">{item.pix || item.bankAccount || "—"}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
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
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [functionKeys, setFunctionKeys] = useState<string[]>(
    workerFunctionKeys(initial ?? { functionKey: LABOR_FUNCTIONS[0]?.key || "garcons", functionKeys: [] }),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div className="space-y-5">
      <Field label="Nome">
        <input className={fieldControlClass} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF">
          <input className={fieldControlClass} value={cpf} onChange={(event) => setCpf(event.target.value)} />
        </Field>
        <Field label="Funções que pode exercer" className="sm:col-span-2">
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-forest/10 p-2">
            {LABOR_FUNCTIONS.map((role) => {
              const checked = functionKeys.includes(role.key);
              return (
                <label
                  key={role.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                    checked ? "bg-forest/8" : "hover:bg-forest/[0.03]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-forest"
                    checked={checked}
                    onChange={() =>
                      setFunctionKeys((current) =>
                        current.includes(role.key)
                          ? current.filter((key) => key !== role.key)
                          : [...current, role.key],
                      )
                    }
                  />
                  {role.label}
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="PIX">
          <input className={fieldControlClass} value={pix} onChange={(event) => setPix(event.target.value)} />
        </Field>
        <Field label="Conta bancária">
          <input
            className={fieldControlClass}
            value={bankAccount}
            onChange={(event) => setBankAccount(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Observações">
        <textarea className={cn(fieldControlClass, "min-h-20 py-2")} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
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
            if (!functionKeys.length) {
              toast.error("Selecione ao menos uma função.");
              return;
            }
            const stamp = new Date().toISOString();
            onSubmit({
              id: initial?.id ?? uid(),
              name: name.trim(),
              cpf: cpf.trim(),
              pix: pix.trim(),
              bankAccount: bankAccount.trim(),
              functionKey: functionKeys[0],
              functionKeys,
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
