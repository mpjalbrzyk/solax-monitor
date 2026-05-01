"use client";

import type { TooltipContentProps } from "recharts";

// Domain palette mirroring globals.css custom properties. Recharts needs
// concrete color strings, so we hardcode the same hex values here. Keep
// in sync with the --pv / --savings / --grid-* / --brand-* / --solar-* vars.
//
// Per design system 10-color-system.md sekcja 5.4:
//   - primary brand = green (savings, autoconsumption)
//   - accent = orange (PV production, energy)
//   - yearCurrent (zielony brand) MUSI dominować nad starszymi latami
export const CHART_COLORS = {
  // Domain colors (legacy aliases, same hexes as in :root vars)
  pv: "#D97706",          // solar-600 — PV production
  savings: "#16A34A",     // brand-600 — savings, money plus
  gridImport: "#DC2626",  // error-icon — pobór z sieci
  gridExport: "#86EFAC",  // brand-300 — eksport (jaśniejszy zielony)
  load: "#475569",        // slate-600 — zużycie domu (neutral)
  muted: "#94A3B8",       // slate-400
  axis: "#94A3B8",        // slate-400

  // Year-over-year palette per doc 5.4 — bieżący rok zielony brand,
  // starsze coraz bardziej pastelowe.
  yearCurrent: "#16A34A",  // brand-600 — bieżący rok mocno
  yearPrevious: "#86EFAC", // brand-300 — rok poprzedni
  yearOlder1: "#FCD34D",   // solar-300 — 2 lata wstecz
  yearOlder2: "#94A3B8",   // slate-400 — 3+ lata wstecz

  // Anomalie
  anomalyLow: "#DC2626",
  anomalyHigh: "#16A34A",

  // Tooltip
  tooltipBg: "#FFFFFF",
  tooltipBorder: "rgba(0, 0, 0, 0.08)",
};

const numberFmt0 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const numberFmt1 = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function chartTickKwh(value: number): string {
  if (Math.abs(value) >= 1000) return `${numberFmt1.format(value / 1000)} MWh`;
  return `${numberFmt1.format(value)} kWh`;
}

export function chartTickKw(value: number): string {
  if (Math.abs(value) >= 1000) return `${numberFmt1.format(value / 1000)} kW`;
  return `${numberFmt0.format(value)} W`;
}

export function chartTickPln(value: number): string {
  return `${numberFmt0.format(value)} zł`;
}

// Glass tooltip matching the rest of the dashboard.
export function GlassTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: Partial<TooltipContentProps<number, string>> & {
  formatter?: (value: number | undefined, name: string | undefined) => string;
  labelFormatter?: (label: string | number | undefined) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <div className="font-medium mb-1">
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      <ul className="flex flex-col gap-0.5">
        {payload.map((entry) => {
          const value = entry.value == null ? null : Number(entry.value);
          const name = String(entry.name ?? "");
          return (
            <li
              key={`${entry.dataKey}-${name}`}
              className="flex items-center gap-2 tabular-nums"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{name}:</span>
              <span className="font-medium">
                {value == null
                  ? "—"
                  : formatter
                    ? formatter(value, name)
                    : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
