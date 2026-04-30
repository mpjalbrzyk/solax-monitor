"use client";

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GlassTooltip, chartTickPln } from "./recharts-base";

// Tesla-style break-even chart per research:
//   "Wykres liniowy rozpoczyna się głęboko poniżej zera, reprezentując
//   początkowe koszty instalacji (CAPEX). Z każdym miesiącem krzywa pnie się
//   ku górze. Złotym Graalem jest punkt, w którym krzywa przecina linię
//   zerową — całkowity zwrot z inwestycji."
//
// We render TWO curves (per Michał's request):
//   - real:  PGE-derived cumulative savings (conservative, true to invoices)
//   - solax: Solax-reported cumulative net (optimistic, biased low by API)
// Both start at -installationCostPln (CAPEX after subsidy).
// Subsidy line: faint reference at -(installationCost+subsidy) — gross paid.
// Break-even line: y=0, dashed.

export type BreakEvenPoint = {
  yearLabel: string;
  yearFraction: number; // for sorting / spacing
  real: number | null; // signed PLN (negative early, positive after break-even)
  solax: number | null;
  isProjection: boolean;
};

export function BreakEvenChart({
  data,
  installationCostPln,
  subsidyPln,
}: {
  data: BreakEvenPoint[];
  installationCostPln: number;
  subsidyPln: number;
}) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych do wykresu progu rentowności.
      </div>
    );
  }

  // Split into actual vs projection segments for each line
  // (Recharts doesn't natively dash one half — we use two series with shared
  // x-axis: '*Actual' fills only historical points, '*Projected' only future)

  return (
    <div className="h-80 sm:h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.savings} stopOpacity={0.4} />
              <stop offset="100%" stopColor={CHART_COLORS.savings} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="solaxGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.pv} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CHART_COLORS.pv} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.92 0 0)"
            vertical={false}
          />
          <XAxis
            dataKey="yearLabel"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={chartTickPln}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            width={68}
          />
          <Tooltip
            content={
              <GlassTooltip
                formatter={(v) => chartTickPln(Number(v ?? 0))}
                labelFormatter={(l) => `Rok ${l}`}
              />
            }
          />

          {/* Break-even line at y=0 (Złoty Graal — moment zwrotu) */}
          <ReferenceLine
            y={0}
            stroke={CHART_COLORS.savings}
            strokeWidth={1.5}
            label={{
              value: "Próg zwrotu",
              position: "right",
              fontSize: 10,
              fill: CHART_COLORS.savings,
              fontWeight: 500,
            }}
          />

          {/* CAPEX line at y=-installationCost (po dotacji, net) */}
          <ReferenceLine
            y={-installationCostPln}
            stroke={CHART_COLORS.gridImport}
            strokeDasharray="2 4"
            strokeWidth={1}
            label={{
              value: `CAPEX netto: −${(installationCostPln / 1000).toFixed(0)}k zł`,
              position: "right",
              fontSize: 10,
              fill: CHART_COLORS.gridImport,
            }}
          />

          {/* Subsidy reference (faint) — gross paid line */}
          <ReferenceLine
            y={-(installationCostPln + subsidyPln)}
            stroke="oklch(0.7 0 0)"
            strokeDasharray="1 5"
            strokeWidth={1}
            label={{
              value: `Brutto: −${((installationCostPln + subsidyPln) / 1000).toFixed(0)}k zł`,
              position: "right",
              fontSize: 9,
              fill: "oklch(0.6 0 0)",
            }}
          />

          {/* REAL scenario — primary, area + line */}
          <Area
            type="monotone"
            dataKey="real"
            name="Realny tempo"
            stroke={CHART_COLORS.savings}
            strokeWidth={2.5}
            fill="url(#realGrad)"
            connectNulls={true}
            isAnimationActive={false}
          />

          {/* SOLAX scenario — secondary, dashed line only */}
          <Line
            type="monotone"
            dataKey="solax"
            name="Solax tempo"
            stroke={CHART_COLORS.pv}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={true}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
