export function CasaBragaMark({
  compact = false,
  onLight = false,
}: {
  compact?: boolean;
  onLight?: boolean;
}) {
  return (
    <p
      className={`font-display tracking-tight ${
        compact ? "text-xl leading-none" : "text-[1.65rem] leading-none"
      } ${onLight ? "text-forest" : "text-cream"}`}
    >
      Casa Braga
    </p>
  );
}
