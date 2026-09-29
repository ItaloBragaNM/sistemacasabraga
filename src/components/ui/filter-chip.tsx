"use client";

import { cn } from "@/lib/utils";

/** Botão de tag/filtro. `tone="danger"` só para perda, ruptura e erro. */
export function FilterChip({
  active,
  onClick,
  disabled,
  tone = "neutral",
  children,
  className,
}: {
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium transition-colors disabled:cursor-default",
        active
          ? tone === "danger"
            ? "border-danger bg-danger text-cream"
            : "border-forest bg-forest text-cream"
          : "border-line bg-white text-forest/70 hover:border-forest/30 hover:text-forest disabled:hover:border-line",
        className,
      )}
    >
      {children}
    </button>
  );
}
