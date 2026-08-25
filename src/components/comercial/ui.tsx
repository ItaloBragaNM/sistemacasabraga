"use client";

import { Info } from "lucide-react";
import { formatBRL } from "@/lib/money";
import { formatInt, formatPercent } from "@/lib/crm/format";
import type { SalesSummary } from "@/lib/crm/metrics";
import { cn } from "@/lib/utils";

export function InfoHint({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("group relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-label="Sobre este indicador"
        className="text-forest/25 transition-colors hover:text-terracotta focus:text-terracotta focus:outline-none"
      >
        <Info className="size-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-6 z-40 hidden w-64 rounded-lg border border-forest/10 bg-white p-3 text-left text-xs font-light leading-5 text-forest/75 shadow-xl group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  sub,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  sub?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-forest"
      : tone === "negative"
        ? "text-terracotta"
        : "text-forest";
  return (
    <div className="rounded-xl border border-forest/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="field-label leading-4">{label}</p>
        {hint ? <InfoHint text={hint} /> : null}
      </div>
      <p className={cn("font-display mt-2 text-[1.9rem] leading-none", toneClass)}>{value}</p>
      {sub ? <p className="mt-1.5 text-xs font-light text-forest/50">{sub}</p> : null}
    </div>
  );
}

export interface BarItem {
  label: string;
  weight: number;
  primary: string;
  secondary?: string;
}

export function BarList({
  items,
  tone = "forest",
  empty = "Sem dados no período.",
}: {
  items: BarItem[];
  tone?: "forest" | "terracotta";
  empty?: string;
}) {
  if (items.length === 0) {
    return <p className="py-4 text-sm font-light text-forest/45">{empty}</p>;
  }
  const max = Math.max(...items.map((item) => item.weight), 1);
  const barColor = tone === "terracotta" ? "bg-terracotta/80" : "bg-forest/70";
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-list text-[0.8rem] text-forest/80">{item.label}</span>
            <span className="shrink-0 text-right text-sm font-medium text-forest">
              {item.primary}
              {item.secondary ? (
                <span className="ml-1.5 text-xs font-light text-forest/45">{item.secondary}</span>
              ) : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest/8">
            <div
              className={cn("h-full rounded-full", barColor)}
              style={{ width: `${Math.max((item.weight / max) * 100, item.weight > 0 ? 4 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface SummaryRow {
  key: string;
  label: string;
  summary: SalesSummary;
  winRate: number;
  muted?: boolean;
}

export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-forest/10 text-left">
            <Th className="pl-1">Segmento</Th>
            <Th align="right">Total Vendido</Th>
            <Th align="right">Ganhos</Th>
            <Th align="right">Ticket Médio</Th>
            <Th align="right">Valor Perdido</Th>
            <Th align="right">Perdidos</Th>
            <Th align="right">% Ganho</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-b border-forest/5 last:border-0 hover:bg-forest/[0.02]"
            >
              <td className={cn("py-2.5 pl-1 font-list text-forest", row.muted && "text-forest/50")}>
                {row.label}
              </td>
              <Td>{formatBRL(row.summary.totalWon)}</Td>
              <Td>{formatInt(row.summary.wonCount)}</Td>
              <Td>{formatBRL(row.summary.ticket)}</Td>
              <Td className="text-terracotta">{formatBRL(row.summary.totalLost)}</Td>
              <Td>{formatInt(row.summary.lostCount)}</Td>
              <Td className="font-medium">{formatPercent(row.winRate)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "field-label py-2 font-normal",
        align === "right" ? "pr-1 text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("py-2.5 pr-1 text-right font-light text-forest/85", className)}>{children}</td>
  );
}

export function ConversionBar({
  wonPct,
  lostPct,
}: {
  wonPct: number;
  lostPct: number;
}) {
  return (
    <div className="flex h-6 w-full overflow-hidden rounded-full bg-forest/8 text-[0.62rem] font-semibold">
      <div
        className="flex items-center justify-center bg-forest text-cream"
        style={{ width: `${wonPct * 100}%` }}
      >
        {wonPct >= 0.12 ? formatPercent(wonPct, 0) : ""}
      </div>
      <div
        className="flex items-center justify-center bg-terracotta text-cream"
        style={{ width: `${lostPct * 100}%` }}
      >
        {lostPct >= 0.12 ? formatPercent(lostPct, 0) : ""}
      </div>
    </div>
  );
}
