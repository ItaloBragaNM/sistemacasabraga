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

export const fieldControlClass =
  "h-10 w-full rounded-md border border-forest/15 bg-white px-3 text-sm text-forest outline-none transition-colors placeholder:text-forest/35 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/15";
