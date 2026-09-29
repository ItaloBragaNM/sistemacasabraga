"use client";

import { cn } from "@/lib/utils";

/** Campo numérico padrão: 80 px × 36 px, alinhado à direita, nunca negativo. */
export function QtyInput({
  value,
  onChange,
  disabled,
  step = 1,
  min = 0,
  ariaLabel,
  edited = false,
  size = "md",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: number | "any";
  min?: number;
  ariaLabel?: string;
  edited?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      aria-label={ariaLabel}
      disabled={disabled}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => {
        const next = Number(event.target.value);
        onChange(Number.isFinite(next) ? Math.max(min, next) : min);
      }}
      className={cn(
        "rounded-md border bg-white px-2 text-right text-sm text-forest tabular outline-none transition-colors focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15 disabled:bg-forest/[0.03] disabled:text-forest/60",
        size === "sm" ? "h-8 w-16" : "h-9 w-20",
        edited ? "border-warn/40 bg-warn-soft" : "border-forest/15",
        className,
      )}
    />
  );
}
