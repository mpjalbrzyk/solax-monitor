"use client";

import type { TooltipContentProps } from "recharts";

// Domain palette mirroring globals.css custom properties. Recharts needs
// concrete color strings, so we hardcode the same oklch values here. Keep
// in sync with the --pv / --savings / --grid-* variables.
export const CHART_COLORS = {
  pv: "oklch(0.74 0.17 60)",
  savings: "oklch(0.68 0.16 155)",
  gridImport: "oklch(0.6 0.2 25)",
  gridExport: "oklch(0.62 0.13 230)",
  load: "oklch(0.45 0.05 250)",
  muted: "oklch(0.7 0 0)",
  axis: "oklch(0.5 0 0)",
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
