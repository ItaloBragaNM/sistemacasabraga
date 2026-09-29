import { cn } from "@/lib/utils";

/** Superfície branca padrão. `flush` remove o padding para tabelas e listas. */
export function Card({
  flush = false,
  className,
  children,
  as: Tag = "section",
}: {
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={cn("surface-card", flush ? "overflow-hidden" : "p-5", className)}>{children}</Tag>;
}

/** Cabeçalho de card: título à esquerda, ações à direita, sempre alinhados ao centro. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {description ? <p className="meta-text mt-0.5">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
