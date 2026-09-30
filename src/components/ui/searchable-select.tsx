"use client";

import { ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldControlClass, fieldControlCompactClass } from "@/components/events/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  hint?: string;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function filterSearchableOptions(options: SearchableOption[], query: string) {
  const term = normalize(query);
  if (!term) return options;
  return options.filter((option) =>
    normalize(`${option.label} ${option.hint ?? ""} ${option.value}`).includes(term),
  );
}

function useDismiss(open: boolean, onClose: () => void, rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
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
  }, [open, onClose, rootRef]);
}

function SearchField({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative border-b border-line p-1.5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-forest/35" />
      <input
        ref={inputRef}
        className="h-8 w-full rounded-md border border-forest/15 bg-white py-0 pl-8 pr-2 text-sm text-forest outline-none placeholder:text-forest/35 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

function OptionButton({
  option,
  active,
  onSelect,
}: {
  option: SearchableOption;
  active?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={cn(
        "flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm",
        active ? "bg-forest/8 font-medium text-forest" : "text-forest hover:bg-forest/[0.04]",
      )}
      onClick={onSelect}
    >
      <span>{option.label}</span>
      {option.hint ? <span className="meta-text mt-0.5 font-normal">{option.hint}</span> : null}
    </button>
  );
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar…",
  emptyLabel,
  searchPlaceholder = "Pesquisar…",
  className,
  triggerClassName,
  compact = false,
  disabled = false,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => filterSearchableOptions(options, query), [options, query]);
  const showEmpty = emptyLabel != null && !normalize(query);

  const label = selected
    ? selected.hint
      ? `${selected.label}`
      : selected.label
    : value
      ? value
      : emptyLabel || placeholder;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          compact ? fieldControlCompactClass : fieldControlClass,
          "flex items-center justify-between gap-2 text-left",
          !selected && !value && "text-forest/45",
          triggerClassName,
        )}
      >
        <span className="min-w-0 truncate">
          {selected?.hint ? (
            <>
              {selected.label}
              <span className="text-forest/45"> · {selected.hint}</span>
            </>
          ) : (
            label
          )}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-forest/40 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute z-30 mt-1 w-full min-w-[16rem] overflow-hidden rounded-lg border border-forest/10 bg-white shadow-xl"
        >
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
            inputRef={searchRef}
          />
          <div className="max-h-64 overflow-y-auto p-1">
            {showEmpty ? (
              <OptionButton
                option={{ value: "", label: emptyLabel }}
                active={!value}
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              />
            ) : null}
            {filtered.length === 0 ? (
              <p className="meta-text px-3 py-2">Nenhum resultado.</p>
            ) : (
              filtered.map((option) => (
                <OptionButton
                  key={option.value || option.label}
                  option={option}
                  active={option.value === value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SearchablePicker({
  label,
  options,
  onSelect,
  searchPlaceholder = "Pesquisar…",
  emptyText = "Nenhum item encontrado.",
  className,
}: {
  label: string;
  options: SearchableOption[];
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const filtered = useMemo(() => filterSearchableOptions(options, query), [options, query]);
  if (options.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button type="button" variant="outline" className="px-4" onClick={() => setOpen((current) => !current)}>
        <Plus data-icon="inline-start" />
        {label}
      </Button>
      {open ? (
        <div className="absolute z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] overflow-hidden rounded-md border border-line bg-white shadow-pop">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
            inputRef={searchRef}
          />
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="meta-text px-3 py-2">{emptyText}</p>
            ) : (
              filtered.map((option) => (
                <OptionButton
                  key={option.value}
                  option={option}
                  onSelect={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
