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
import { LocalForm } from "@/components/cadastros/local-form";
import { CadastrosHeader, CatalogFilters, EmptyBlock, LoadingBlock, Modal } from "@/components/cadastros/ui";
import { SortableTh, compareSort, useColumnSort } from "@/components/cadastros/sort-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { CASA_BRAGA_LOCAL_ID, type LocalRecord } from "@/lib/cadastros/types";
import { VENUE_KIND_LABELS } from "@/lib/labels";

export function LocaisAdmin() {
  const { data, ready, upsertLocal, removeLocal, removeMany, duplicateMany } = useCadastros();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [editing, setEditing] = useState<LocalRecord | null>(null);
  const [open, setOpen] = useState(false);
  const sort = useColumnSort<"name" | "kind" | "address" | "contact">("name");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    const contact = (item: LocalRecord) => item.contactName || item.phone || item.email || "";
    const list = [...(data.locais ?? [])].sort((a, b) => {
      const value = {
        name: a.name,
        kind: VENUE_KIND_LABELS[a.kind],
        address: a.address || "",
        contact: contact(a),
      }[sort.key];
      const other = {
        name: b.name,
        kind: VENUE_KIND_LABELS[b.kind],
        address: b.address || "",
        contact: contact(b),
      }[sort.key];
      return compareSort(value, other, sort.dir) || a.name.localeCompare(b.name, "pt-BR");
    });
    return list.filter((item) => {
      if (kindFilter && item.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.address.toLowerCase().includes(term) ||
        item.contactName.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
      );
    });
  }, [data, search, kindFilter, sort.key, sort.dir]);

  const selection = useItemSelection(filtered.map((item) => item.id));

  const startNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const duplicate = (ids: string[]) => {
    if (ids.length === 0) return;
    duplicateMany("locais", ids);
    toast.success(ids.length === 1 ? "Local duplicado." : `${ids.length} locais duplicados.`);
    selection.clear();
  };

  const removeSelected = () => {
    if (selection.selectedVisible.includes(CASA_BRAGA_LOCAL_ID)) {
      toast.error("O local Casa Braga não pode ser excluído.");
      return;
    }
    if (!confirmBulkDelete(selection.selectedVisible.length)) return;
    removeMany("locais", selection.selectedVisible);
    toast.success("Locais excluídos.");
    selection.clear();
  };

  return (
    <PageShell>
      <CadastrosHeader
        title="Locais"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ImportExport entity="locais" />
            <Button className="h-10 px-5" onClick={startNew}>
              <Plus data-icon="inline-start" />
              Novo local
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
            searchPlaceholder="Buscar por nome, endereço ou contato…"
            facets={[
              {
                id: "kind",
                label: "Tipo",
                value: kindFilter,
                onChange: setKindFilter,
                options: Object.entries(VENUE_KIND_LABELS).map(([value, label]) => ({ value, label })),
              },
            ]}
          />
          <BulkBar
            count={selection.selectedVisible.length}
            noun="local"
            onDuplicate={() => duplicate(selection.selectedVisible)}
            onDelete={removeSelected}
            onClear={selection.clear}
          />
          {filtered.length === 0 ? (
            <EmptyBlock
              title="Nenhum local"
              description="Cadastre espaços para vincular no relatório do evento."
              action={
                <Button className="h-10" onClick={startNew}>
                  <Plus data-icon="inline-start" />
                  Novo local
                </Button>
              }
            />
          ) : (
            <Card flush className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="w-10 py-3 pl-5 pr-3">
                      <ItemCheckbox
                        label="Selecionar todos"
                        checked={selection.allVisibleSelected}
                        indeterminate={selection.someVisibleSelected}
                        onChange={selection.toggleAllVisible}
                      />
                    </th>
                    <SortableTh label="Local" active={sort.key === "name"} dir={sort.dir} onClick={() => sort.toggle("name")} />
                    <SortableTh label="Tipo" active={sort.key === "kind"} dir={sort.dir} onClick={() => sort.toggle("kind")} />
                    <SortableTh
                      label="Endereço"
                      active={sort.key === "address"}
                      dir={sort.dir}
                      onClick={() => sort.toggle("address")}
                    />
                    <SortableTh
                      label="Contato"
                      active={sort.key === "contact"}
                      dir={sort.dir}
                      onClick={() => sort.toggle("contact")}
                    />
                    <th className="field-label py-3 pr-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0 hover:bg-forest/[0.02]">
                      <td className="py-3 pl-5 pr-3">
                        <ItemCheckbox
                          label={`Selecionar ${item.name}`}
                          checked={selection.selected.has(item.id)}
                          onChange={() => selection.toggle(item.id)}
                        />
                      </td>
                      <td className="max-w-[16rem] py-3 pr-3">
                        <p className="break-words font-medium leading-snug text-forest">{item.name}</p>
                        {item.outOfTown ? <p className="meta-text mt-0.5">Fora da cidade</p> : null}
                      </td>
                      <td className="py-3 pr-3 text-forest/70">{VENUE_KIND_LABELS[item.kind]}</td>
                      <td className="max-w-[16rem] py-3 pr-3 text-forest/70">{item.address || "—"}</td>
                      <td className="py-3 pr-3 text-forest/70">
                        {item.contactName || item.phone || item.email || "—"}
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
                            if (item.id === CASA_BRAGA_LOCAL_ID) {
                              toast.error("O local Casa Braga não pode ser excluído.");
                              return;
                            }
                            if (window.confirm(`Excluir "${item.name}"?`)) {
                              removeLocal(item.id);
                              toast.success("Local excluído.");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {data ? (
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar local" : "Novo local"} wide>
          <LocalForm
            key={editing?.id ?? "new"}
            initial={editing}
            showHistory={Boolean(editing)}
            onCancel={() => setOpen(false)}
            onSubmit={(local) => {
              upsertLocal(local);
              toast.success(editing ? "Local atualizado." : "Local cadastrado.");
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </PageShell>
  );
}
