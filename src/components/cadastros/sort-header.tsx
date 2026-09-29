"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export function useColumnSort<K extends string>(initial: K, initialDir: SortDir = "asc") {
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const toggle = (next: K) => {
    if (key === next) setDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setKey(next);
      setDir("asc");
    }
  };
  return { key, dir, toggle };
}

export function compareSort(a: string | number, b: string | number, dir: SortDir) {
  const compared =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "pt-BR", { numeric: true });
  return dir === "asc" ? compared : -compared;
}

export function SortButton({
  label,
  dir,
  onClick,
  active = true,
  className,
}: {
  label: string;
  dir: SortDir;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "field-label group inline-flex cursor-pointer items-center gap-1 hover:text-forest",
        active ? "text-forest" : "text-forest/55",
        className,
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : (
        <ArrowUp className="size-3 opacity-0 group-hover:opacity-40" />
      )}
    </button>
  );
}

export function SortableTh({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "field-label py-3 pr-3",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group inline-flex cursor-pointer items-center gap-1 hover:text-forest",
          active ? "text-forest" : "text-forest/55",
          align === "right" && "ml-auto flex-row-reverse",
          align === "center" && "mx-auto",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
        ) : (
          <ArrowUp className="size-3 opacity-0 group-hover:opacity-40" />
        )}
      </button>
    </th>
  );
}
