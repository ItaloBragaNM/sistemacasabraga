"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function useItemSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedVisible = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected],
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someVisibleSelected = selectedVisible.length > 0 && !allVisibleSelected;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (visibleIds.every((id) => next.has(id))) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const clear = () => setSelected(new Set());

  return {
    selected,
    selectedVisible,
    allVisibleSelected,
    someVisibleSelected,
    toggle,
    toggleAllVisible,
    clear,
  };
}

export function confirmBulkDelete(count: number) {
  return window.confirm(
    `Excluir ${count} ${count === 1 ? "item selecionado" : "itens selecionados"}? A ação não pode ser desfeita.`,
  );
}

export function ItemCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 shrink-0 accent-forest"
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = Boolean(indeterminate) && !checked;
      }}
      onChange={onChange}
    />
  );
}

export function BulkBar({
  count,
  noun,
  onDuplicate,
  onDelete,
  onClear,
}: {
  count: number;
  noun: string;
  onDuplicate: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-forest/10 bg-white px-3 py-2">
      <p className="text-sm font-light text-forest/70">
        {count} {noun}
        {count === 1 ? "" : "s"} selecionado{count === 1 ? "" : "s"}
      </p>
      <Button variant="outline" className="h-9 px-3" onClick={onDuplicate}>
        <Copy data-icon="inline-start" />
        Duplicar
      </Button>
      <Button
        variant="outline"
        className="h-9 px-3 text-terracotta hover:bg-terracotta/10"
        onClick={onDelete}
      >
        <Trash2 data-icon="inline-start" />
        Excluir
      </Button>
      <button
        type="button"
        className="text-xs font-light text-forest/45 hover:text-forest"
        onClick={onClear}
      >
        Limpar seleção
      </button>
    </div>
  );
}

export function RecordRowActions({
  label,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <IconAction label={`Duplicar ${label}`} onClick={onDuplicate}>
        <Copy className="size-4" />
      </IconAction>
      <IconAction label={`Editar ${label}`} onClick={onEdit}>
        <Pencil className="size-4" />
      </IconAction>
      <IconAction label={`Excluir ${label}`} onClick={onDelete} danger>
        <Trash2 className="size-4" />
      </IconAction>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-colors",
        danger
          ? "text-forest/40 hover:bg-terracotta/10 hover:text-terracotta"
          : "text-forest/50 hover:bg-forest/5 hover:text-forest",
      )}
    >
      {children}
    </button>
  );
}
