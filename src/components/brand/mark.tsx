export function CasaBragaMark({
  compact = false,
  onLight = false,
}: {
  compact?: boolean;
  onLight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${onLight ? "text-forest" : "text-cream"}`}>
      <div
        className={`flex size-10 items-center justify-center ${
          onLight
            ? "border border-forest/20 bg-forest text-cream"
            : "border border-cream/25 bg-forest/40"
        }`}
      >
        <span className="font-display text-lg leading-none">CB</span>
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-display text-[1.65rem] tracking-tight">Casa Braga</p>
          <p
            className={`font-section mt-1 text-[0.62rem] ${
              onLight ? "text-forest/50" : "text-cream/60"
            }`}
          >
            Gestão de Eventos
          </p>
        </div>
      )}
    </div>
  );
}
