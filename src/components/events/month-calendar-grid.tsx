"use client";

import { format, isSameMonth, isToday } from "date-fns";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Grade mensal compacta: o mês inteiro cabe na área visível; o excesso rola dentro do dia. */
export function MonthCalendarGrid({
  days,
  cursor,
  className,
  headerExtra,
  children,
}: {
  days: Date[];
  cursor: Date;
  className?: string;
  headerExtra?: (day: Date) => React.ReactNode;
  children: (day: Date) => React.ReactNode;
}) {
  const weeks = Math.max(5, Math.ceil(days.length / 7));

  return (
    <Card flush className={cn("flex min-h-[12rem] flex-1 flex-col overflow-hidden", className)}>
      <div className="grid shrink-0 grid-cols-7 border-b border-line bg-cream/80">
        {WEEKDAYS.map((label) => (
          <p key={label} className="px-1 py-1.5 text-center text-[11px] font-medium text-forest/50">
            {label}
          </p>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const outside = !isSameMonth(day, cursor);
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-b border-line p-1 last:border-r-0",
                outside && "bg-cream/40",
                today && "bg-forest/5",
              )}
            >
              <div className="mb-0.5 flex shrink-0 items-center justify-between gap-0.5">
                <span
                  className={cn(
                    "tabular flex size-5 items-center justify-center rounded text-[11px]",
                    today ? "bg-forest text-cream" : outside ? "text-forest/30" : "text-forest",
                  )}
                >
                  {format(day, "d")}
                </span>
                {headerExtra?.(day)}
              </div>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">{children(day)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
