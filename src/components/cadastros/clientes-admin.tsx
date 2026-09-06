"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCadastros } from "@/components/cadastros/cadastros-provider";
import {
  BulkBar,
  confirmBulkDelete,
  ItemCheckbox,
  RecordRowActions,
  useItemSelection,
} from "@/components/cadastros/bulk";
import { ImportExport } from "@/components/cadastros/import-export";
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { ClienteForm } from "@/components/cadastros/cliente-form";
import { Button } from "@/components/ui/button";
import { CLIENT_KIND_LABELS, type ClienteRecord } from "@/lib/cadastros/types";

export function ClientesAdmin() {
  const { data, ready, upsertCliente, removeCliente, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [editing, setEditing] = useState<ClienteRecord | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const list = [...data.clientes].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return list.filter((item) => {
      if (kindFilter && item.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.document.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term)
      );
    });
  }, [data, search, kindFilter]);

  const selection = useItemSelection(filtered.map((item) => item.id));

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const duplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    duplicateMany("clientes", ids);
    toast.success(ids.length === 1 ? "Cliente duplicado." : `${ids.length} clientes duplicados.`);
    selection.clear();
  };

  const removeSelected = () => {
    if (!confirmBulkDelete(selection.selectedVisible.length)) return;
    removeMany("clientes", selection.selectedVisible);
    toast.success("Clientes excluídos.");
    selection.clear();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <CadastrosHeader
        title="Clientes"
        description="Base comercial de clientes da casa. Importe/exporte por planilha quando precisar."
        action={
          <div className="flex flex-wrap gap-2">
            <ImportExport entity="clientes" />
            <Button className="h-10 bg-forest px-5 text-cream hover:bg-petrol" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo cliente
            </Button>
          </div>
        }
      />

      {!ready ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="Cadastros indisponíveis" description="Recarregue a página." />
      ) : (
        <>
          <CatalogFilters
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por nome, documento ou e-mail…"
            facets={[
              {
                id: "kind",
                label: "Tipo",
                value: kindFilter,
                onChange: setKindFilter,
                options: [
                  { value: "pf", label: CLIENT_KIND_LABELS.pf },
                  { value: "pj", label: CLIENT_KIND_LABELS.pj },
                ],
              },
            ]}
          />
          <BulkBar
            count={selection.selectedVisible.length}
            noun="cliente"
            onDuplicate={() => duplicate(selection.selectedVisible)}
            onDelete={removeSelected}
            onClear={selection.clear}
          />
          {filtered.length === 0 ? (
            <EmptyBlock
              title="Nenhum cliente"
              description="Cadastre clientes manualmente ou importe de uma planilha."
              action={
                <Button className="bg-forest text-cream hover:bg-petrol" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo cliente
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    <th className="w-10 py-3 pl-5">
                      <ItemCheckbox
                        label="Selecionar todos"
                        checked={selection.allVisibleSelected}
                        indeterminate={selection.someVisibleSelected}
                        onChange={selection.toggleAllVisible}
                      />
                    </th>
                    <th className="field-label py-3 font-normal">Cliente</th>
                    <th className="field-label py-3 font-normal">Tipo</th>
                    <th className="field-label py-3 font-normal">Documento</th>
                    <th className="field-label py-3 font-normal">Contato</th>
                    <th className="field-label py-3 pr-5 text-right font-normal">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]"
                    >
                      <td className="py-3 pl-5">
                        <ItemCheckbox
                          label={`Selecionar ${item.name}`}
                          checked={selection.selected.has(item.id)}
                          onChange={() => selection.toggle(item.id)}
                        />
                      </td>
                      <td className="py-3">
                        <p className="font-list font-medium text-forest">{item.name}</p>
                        {item.address ? (
                          <p className="text-xs font-light text-forest/45">{item.address}</p>
                        ) : null}
                      </td>
                      <td className="py-3 text-forest/70">{CLIENT_KIND_LABELS[item.kind]}</td>
                      <td className="py-3 text-forest/70">{item.document || "—"}</td>
                      <td className="py-3 text-forest/70">
                        {item.phone || item.email || "—"}
                      </td>
                      <td className="py-3 pr-5">
                        <RecordRowActions
                          label={item.name}
                          onEdit={() => {
                            setEditing(item);
                            setOpen(true);
                          }}
                          onDuplicate={() => duplicate([item.id])}
                          onDelete={() => {
                            if (window.confirm(`Excluir "${item.name}"?`)) {
                              removeCliente(item.id);
                              toast.success("Cliente excluído.");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {data ? (
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar cliente" : "Novo cliente"} wide>
          <ClienteForm
            key={editing?.id ?? "new"}
            initial={editing}
            showHistory={Boolean(editing)}
            onCancel={() => setOpen(false)}
            onSubmit={(cliente) => {
              upsertCliente(cliente);
              toast.success(editing ? "Cliente atualizado." : "Cliente cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
