"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GlassTooltip, chartTickPln } from "./recharts-base";
import type { LongTermForecast } from "@/lib/derive/forecasts";

// Tesla-style "what if" curve. Three scenarios filling area:
//   noPriceGrowth (lower edge)  — bottom of fill
//   moderate (5%)               — middle line
//   high (10%)                  — top of fill
// Reference lines at +5 / +10 / +15 / +20 lat for orientation.

export function LongTermForecastChart({
  data,
}: {
  data: LongTermForecast[];
}) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych do prognozy.
      </div>
    );
  }

  return (
    <div className="h-80 sm:h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 16, right: 16, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.savings} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.savings} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
          <XAxis
            dataKey="yearLabel"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
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

          {/* Reference lines for milestone years */}
          {[2030, 2040, 2050].map((year) => {
            const point = data.find((p) => p.yearLabel === String(year));
            if (!point) return null;
            return (
              <ReferenceLine
                key={year}
                x={String(year)}
                stroke="oklch(0.7 0 0)"
                strokeDasharray="2 4"
                strokeWidth={1}
                label={{
                  value: String(year),
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "oklch(0.5 0 0)",
                }}
              />
            );
          })}

          {/* High (10% energy growth) — top of band */}
          <Area
            type="monotone"
            dataKey="high"
            name="Z 10% wzrostem cen rocznie"
            stroke={CHART_COLORS.savings}
            strokeWidth={2}
            fill="url(#forecastBand)"
            isAnimationActive={false}
          />
          {/* Moderate (5% energy growth) — middle line */}
          <Area
            type="monotone"
            dataKey="moderate"
            name="Z 5% wzrostem cen rocznie"
            stroke={CHART_COLORS.gridExport}
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="transparent"
            isAnimationActive={false}
          />
          {/* No price growth — bottom line */}
          <Area
            type="monotone"
            dataKey="noPriceGrowth"
            name="Bez wzrostu cen"
            stroke={CHART_COLORS.muted}
            strokeWidth={1.5}
            strokeDasharray="2 4"
            fill="transparent"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
