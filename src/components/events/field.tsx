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
    <div className="mb-4 flex flex-col gap-1 border-b border-forest/10 pb-3">
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
  children,
}: {
  title: string;
  eyebrow?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("rounded-2xl border border-forest/10 bg-white", compact ? "p-3 sm:p-4" : "p-5 sm:p-6")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-start justify-between gap-3 text-left",
          open && (compact ? "mb-3 border-b border-forest/10 pb-2" : "mb-5 border-b border-forest/10 pb-3"),
        )}
      >
        <div>
          {eyebrow ? <p className="text-[13px] font-medium text-forest/50">{eyebrow}</p> : null}
          <h2 className={cn("font-semibold text-forest", compact ? "text-sm" : "text-[15px]", eyebrow && "mt-1")}>{title}</h2>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-forest/40 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? children : null}
    </section>
  );
}

export const fieldControlClass =
  "h-10 w-full rounded-md border border-forest/15 bg-white px-3 font-sans text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15";

export const fieldControlCompactClass =
  "h-8 w-full rounded-md border border-forest/15 bg-white px-2.5 font-sans text-[13px] text-forest outline-none transition-colors placeholder:text-forest/35 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15";
