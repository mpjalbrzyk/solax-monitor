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

export type ForecastPoint = {
  yearLabel: string;
  cumulative_pln: number;
  isProjection: boolean;
};

// Single data array, two parallel series. The actual series is null beyond the
// last historical point; the projection series is null before it (with a
// single overlap so the lines connect cleanly).
type EnrichedPoint = {
  yearLabel: string;
  actual: number | null;
  projection: number | null;
};

function enrich(data: ForecastPoint[]): EnrichedPoint[] {
  let lastActualIdx = -1;
  data.forEach((d, i) => {
    if (!d.isProjection) lastActualIdx = i;
  });
  return data.map((d, i) => ({
    yearLabel: d.yearLabel,
    actual: !d.isProjection ? d.cumulative_pln : null,
    // Connect: include the last actual point in the projection series too,
    // so the dashed line touches the solid area without a gap.
    projection: d.isProjection || i === lastActualIdx ? d.cumulative_pln : null,
  }));
}

export function ForecastChart({
  data,
  breakEvenPln,
}: {
  data: ForecastPoint[];
  breakEvenPln: number;
}) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych do prognozy.
      </div>
    );
  }

  const enriched = enrich(data);

  return (
    <div className="h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={enriched}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.savings} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.savings} stopOpacity={0.02} />
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
          <ReferenceLine
            y={breakEvenPln}
            stroke={CHART_COLORS.gridImport}
            strokeDasharray="4 4"
            label={{
              value: "Próg zwrotu",
              position: "right",
              fontSize: 10,
              fill: CHART_COLORS.gridImport,
            }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            name="Bilans rzeczywisty"
            stroke={CHART_COLORS.savings}
            strokeWidth={2}
            fill="url(#cumulativeGradient)"
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="projection"
            name="Prognoza"
            stroke={CHART_COLORS.savings}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
