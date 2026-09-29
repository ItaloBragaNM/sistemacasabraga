"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("inline-flex h-10 items-center gap-1 rounded-md border border-line bg-white p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 whitespace-nowrap rounded px-3 text-[13px] font-medium transition-colors",
              active ? "bg-forest text-cream" : "text-forest/65 hover:bg-forest/[0.04] hover:text-forest",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
