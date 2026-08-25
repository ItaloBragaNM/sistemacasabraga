export function formatInt(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value || 0));
}

export function formatPercent(value: number, digits = 1): string {
  return `${(Number.isFinite(value) ? value * 100 : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Compact BRL for tight spaces, e.g. R$ 19,9 mil / R$ 1,2 mi. */
export function formatBRLCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
