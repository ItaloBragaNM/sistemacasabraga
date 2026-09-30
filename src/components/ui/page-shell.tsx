import { cn } from "@/lib/utils";

/** Largura, respiro e cabeçalho comuns a todas as telas do app. */
export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  back,
  width = "default",
  fillViewport = false,
  className,
  children,
}: {
  eyebrow?: string;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
  width?: "default" | "wide" | "narrow";
  fillViewport?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto",
        fillViewport
          ? "flex h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-7.5rem)] flex-col gap-3 overflow-hidden pb-3 lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)]"
          : "space-y-6 pb-16",
        width === "wide" ? "max-w-6xl" : width === "narrow" ? "max-w-3xl" : "max-w-5xl",
        className,
      )}
    >
      {title ? (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
          back={back}
          compact={fillViewport}
        />
      ) : null}
      {fillViewport ? <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div> : children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between",
        compact ? "pb-3" : "pb-4",
      )}
    >
      <div className="min-w-0">
        {back ? <div className="mb-2">{back}</div> : null}
        {eyebrow ? <p className="text-[13px] font-medium text-forest/50">{eyebrow}</p> : null}
        <h1 className="page-title mt-1">{title}</h1>
        {description ? <p className="meta-text mt-1.5 max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
