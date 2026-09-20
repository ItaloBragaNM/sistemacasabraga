import { EVENT_STATUS_LABELS } from "@/lib/labels";
import type { EventStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-left text-[13px] font-medium leading-snug break-words",
        `status-${status}`,
        className,
      )}
    >
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}
