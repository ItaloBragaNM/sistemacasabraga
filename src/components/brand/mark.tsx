export function CasaBragaMark({
  compact = false,
  onLight = false,
}: {
  compact?: boolean;
  onLight?: boolean;
}) {
  return (
    <p
      className={`font-semibold tracking-tight ${
        compact ? "text-[18px] leading-none" : "text-[22px] leading-none"
      } ${onLight ? "text-forest" : "text-cream"}`}
    >
      Casa Braga
    </p>
  );
}
