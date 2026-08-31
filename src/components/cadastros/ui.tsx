"use client";

import { Search, X } from "lucide-react";
import { useEffect } from "react";
import { fieldControlClass } from "@/components/events/field";
import { cn } from "@/lib/utils";

export function CadastrosHeader({
  eyebrow = "Cadastros",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-forest/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-section text-[0.68rem] text-terracotta">{eyebrow}</p>
        <h1 className="font-display mt-1 text-4xl text-forest sm:text-5xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-light text-forest/60">{description}</p>
      </div>
      {action}
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

export function CatalogFilters({
  search,
  onSearch,
  searchPlaceholder = "Buscar…",
  facets = [],
}: {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  facets?: FilterFacet[];
}) {
  const active = Boolean(search.trim()) || facets.some((facet) => facet.value);

  const clear = () => {
    onSearch("");
    for (const facet of facets) facet.onChange("");
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[200px] flex-1">
        <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
      </div>
      {facets.map((facet) => (
        <label key={facet.id} className="block min-w-[160px] space-y-1.5">
          <span className="field-label">{facet.label}</span>
          <select
            className={fieldControlClass}
            value={facet.value}
            onChange={(event) => facet.onChange(event.target.value)}
          >
            <option value="">Todos</option>
            {facet.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {active ? (
        <button
          type="button"
          onClick={clear}
          className="h-10 shrink-0 text-sm font-light text-forest/55 hover:text-forest"
        >
          Limpar filtros
        </button>
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
        className="fixed inset-0 bg-forest/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 my-4 w-full rounded-2xl border border-forest/10 bg-cream shadow-2xl",
          wide ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
          <h2 className="font-section text-[0.82rem] text-forest">{title}</h2>
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
    <p className="py-16 text-center text-sm font-light text-forest/50">{label}</p>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest/20 bg-white/60 p-10 text-center">
      <h3 className="font-display text-2xl text-forest">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-light text-forest/55">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
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
          ? "px-2 py-0.5 text-[0.58rem] uppercase tracking-wide"
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
