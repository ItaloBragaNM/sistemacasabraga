"use client";

import { fieldControlClass } from "@/components/events/field";
import { cn } from "@/lib/utils";

export type DateSort = "asc" | "desc";

export function compareDateSort(a: string, b: string, direction: DateSort) {
  const left = a || "";
  const right = b || "";
  return direction === "asc" ? left.localeCompare(right) : right.localeCompare(left);
}

export function DateSortSelect({
  value,
  onChange,
  className,
}: {
  value: DateSort;
  onChange: (value: DateSort) => void;
  className?: string;
}) {
  return (
    <select
      aria-label="Ordenar por data"
      className={cn(fieldControlClass, "h-10 w-auto min-w-[11rem] shrink-0", className)}
      value={value}
      onChange={(event) => onChange(event.target.value === "asc" ? "asc" : "desc")}
    >
      <option value="desc">Data · mais recente</option>
      <option value="asc">Data · mais antiga</option>
    </select>
  );
}
