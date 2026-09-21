"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fieldControlClass } from "@/components/events/field";
import { cn } from "@/lib/utils";

export function CadastrosHeader({
  eyebrow = "Cadastros",
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-forest/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-forest/50">{eyebrow}</p>
        <h1 className="page-title mt-1">{title}</h1>
      </div>
      {action ? <div className="flex shrink-0 flex-nowrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-forest/35" />
      <input
        className={cn(fieldControlClass, "pl-9")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export type FilterFacet = {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export type MultiFilterFacet = {
  id: string;
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (values: string[]) => void;
  countedNoun?: string;
};

export function CatalogFilters({
  search,
  onSearch,
  searchPlaceholder = "Buscar…",
  facets = [],
  multiFacets = [],
  extra,
  compact = false,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  facets?: FilterFacet[];
  multiFacets?: MultiFilterFacet[];
  extra?: React.ReactNode;
  compact?: boolean;
}) {
  const active =
    Boolean(search.trim()) ||
    facets.some((facet) => facet.value) ||
    multiFacets.some((facet) => facet.values.length > 0);

  const clear = () => {
    onSearch("");
    for (const facet of facets) facet.onChange("");
    for (const facet of multiFacets) facet.onChange([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[180px] flex-1">
        <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
      </div>
      {facets.map((facet) => (
        <select
          key={facet.id}
          aria-label={facet.label}
          className={cn(fieldControlClass, "h-10 w-auto min-w-[9.5rem] shrink-0")}
          value={facet.value}
          onChange={(event) => facet.onChange(event.target.value)}
        >
          <option value="">{compact ? facet.label : `Todos · ${facet.label}`}</option>
          {facet.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      {multiFacets.map((facet) => (
        <FilterMultiSelect
          key={facet.id}
          value={facet.values}
          onChange={facet.onChange}
          options={facet.options.map((option) => ({ key: option.value, label: option.label }))}
          emptyLabel={facet.label}
          countedNoun={facet.countedNoun ?? "categorias"}
        />
      ))}
      {extra}
      {active ? (
        <button
          type="button"
          onClick={clear}
          className="h-10 shrink-0 text-sm text-forest/55 hover:text-forest"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}

export function FilterMultiSelect({
  value,
  onChange,
  options,
  emptyLabel,
  countedNoun,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: { key: string; label: string }[];
  emptyLabel: string;
  countedNoun: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allowed = new Set(options.map((item) => item.key));
  const selected = value.filter((item) => allowed.has(item));
  const labels = new Map(options.map((item) => [item.key, item.label]));

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onPointer);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    selected.length === 0
      ? emptyLabel
      : selected.length === 1
        ? (labels.get(selected[0]) ?? selected[0])
        : `${selected.length} ${countedNoun}`;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(fieldControlClass, "flex w-[13.5rem] items-center justify-between gap-2 bg-white")}
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-forest/40 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-72 w-[13.5rem] overflow-y-auto rounded-lg border border-forest/10 bg-white p-1 shadow-xl"
        >
          <button
            type="button"
            className={cn(
              "flex w-full items-center rounded-md px-3 py-2 text-left text-sm",
              selected.length === 0 ? "bg-forest/8 font-medium text-forest" : "text-forest/70 hover:bg-forest/[0.03]",
            )}
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
          >
            {emptyLabel}
          </button>
          {options.map((item) => {
            const checked = selected.includes(item.key);
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-forest hover:bg-forest/[0.03]"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-forest"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked ? selected.filter((key) => key !== item.key) : [...selected, item.key],
                    )
                  }
                />
                {item.label}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 bg-forest/40"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 my-4 w-full rounded-lg border border-forest/10 bg-cream shadow-sm",
          wide ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-forest">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-lg text-forest/50 transition-colors hover:bg-forest/5 hover:text-forest"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function LoadingBlock({ label = "Carregando…" }: { label?: string }) {
  return (
    <p className="py-16 text-center text-sm text-forest/50">{label}</p>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-forest/20 bg-white p-8 text-center">
      <h3 className="text-[15px] font-semibold text-forest">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-forest/55">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Label chip: one rounded box even when the text wraps onto several lines. */
export function Chip({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "sm";
}) {
  return (
    <span
      className={cn(
        "inline-block max-w-full rounded-md text-left align-middle leading-snug break-words",
        size === "sm"
          ? "px-2 py-0.5 text-[13px] font-medium"
          : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Chip with a trailing action (remove). Stays a single rounded rectangle if the label wraps. */
export function ChipRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border border-forest/12 bg-forest/[0.03] py-1 pl-3 pr-1.5 text-left text-sm leading-snug text-forest",
        className,
      )}
    >
      {children}
    </span>
  );
}
