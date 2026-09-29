"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  hint,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1 border-b border-line pb-3">
      {eyebrow && (
        <p className="text-[13px] font-medium text-forest/50">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-[15px] font-semibold text-forest">{title}</h2>
        {hint && <p className="text-[13px] text-forest/50">{hint}</p>}
      </div>
    </div>
  );
}

export function FichaSection({
  title,
  eyebrow,
  defaultOpen = true,
  compact = false,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("surface-card", compact ? "p-4" : "p-5")}>
      <div
        className={cn(
          "flex items-center gap-2",
          open && (compact ? "mb-3 border-b border-line pb-2" : "mb-4 border-b border-line pb-3"),
        )}
      >
        <button type="button" onClick={() => setOpen((current) => !current)} className="min-w-0 flex-1 text-left">
          {eyebrow ? <p className="text-[13px] font-medium text-forest/50">{eyebrow}</p> : null}
          <h2 className={cn("font-semibold text-forest", compact ? "text-sm" : "text-[15px]", eyebrow && "mt-1")}>
            {title}
          </h2>
        </button>
        {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Recolher seção" : "Expandir seção"}
          onClick={() => setOpen((current) => !current)}
          className="flex size-8 shrink-0 items-center justify-center text-forest/40"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? children : null}
    </section>
  );
}

export const fieldControlClass =
  "h-10 w-full rounded-md border border-forest/15 bg-white px-3 font-sans text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15";

export const fieldControlCompactClass =
  "h-8 w-full rounded-md border border-forest/15 bg-white px-2.5 font-sans text-[13px] text-forest outline-none transition-colors placeholder:text-forest/35 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15";
