import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "ok" | "warn" | "danger" | "info";

const TONES: Record<StatusTone, string> = {
  neutral: "bg-forest/[0.06] text-forest/70",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger/10 text-danger",
  info: "bg-forest/10 text-forest",
};

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger";
  className?: string;
}) {
  return (
    <div className={cn("surface-card px-4 py-3.5", className)}>
      <p className="field-label">{label}</p>
      <p
        className={cn(
          "mt-1 text-[22px] font-semibold leading-tight tabular",
          tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-forest",
        )}
      >
        {value}
      </p>
      {hint ? <p className="meta-text mt-1 line-clamp-2">{hint}</p> : null}
    </div>
  );
}
