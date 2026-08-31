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
        "font-section inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-left text-[0.58rem] leading-snug break-words",
        `status-${status}`,
        className,
      )}
    >
      {EVENT_STATUS_LABELS[status]}
    </span>
  );
}
