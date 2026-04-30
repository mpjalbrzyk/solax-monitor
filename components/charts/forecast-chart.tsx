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

  // Split data into actual vs projection so we can style them differently.
  const actualSeries = data.map((d) =>
    d.isProjection ? { ...d, cumulative_pln: undefined } : d,
  );
  const projectionSeries = data.map((d, idx) => {
    // Connect projection start to last actual value so the line is continuous.
    if (!d.isProjection) {
      const next = data[idx + 1];
      if (next?.isProjection) return d;
      return { ...d, cumulative_pln: undefined };
    }
    return d;
  });

  return (
    <div className="h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
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
            data={actualSeries}
            dataKey="cumulative_pln"
            name="Bilans rzeczywisty"
            stroke={CHART_COLORS.savings}
            strokeWidth={2}
            fill="url(#cumulativeGradient)"
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            data={projectionSeries}
            dataKey="cumulative_pln"
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
