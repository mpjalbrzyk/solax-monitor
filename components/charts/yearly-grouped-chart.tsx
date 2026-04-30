"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GlassTooltip, chartTickKwh } from "./recharts-base";

export type YearlyMonthPoint = {
  monthLabel: string; // "Sty", "Lut", ...
  monthIdx: number;
  // Each year as its own key — set up in builder below.
  [year: string]: number | string;
};

export function YearlyGroupedChart({
  data,
  years,
}: {
  data: YearlyMonthPoint[];
  years: number[];
}) {
  if (data.length === 0 || years.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych do porównania.
      </div>
    );
  }

  // Each year picks a different chart-color slot from globals.
  const yearColors = [
    CHART_COLORS.pv,
    CHART_COLORS.gridExport,
    CHART_COLORS.savings,
    CHART_COLORS.muted,
  ];

  return (
    <div className="h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.92 0 0)"
            vertical={false}
          />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={chartTickKwh}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={
              <GlassTooltip
                formatter={(v: number | undefined) => chartTickKwh(Number(v ?? 0))}
                labelFormatter={(l) => `${l}`}
              />
            }
            cursor={{ fill: "oklch(0.95 0 0 / 0.6)" }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {years.map((year, idx) => (
            <Bar
              key={year}
              dataKey={String(year)}
              name={String(year)}
              fill={yearColors[idx % yearColors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
