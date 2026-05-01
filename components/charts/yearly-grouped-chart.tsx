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

  // Audit C.6: current year always brand color (savings green, strongest),
  // historical years gradient lightness from newest to oldest.
  // savings (latest) → pv (penultimate) → gridExport (older) → muted (oldest)
  const currentYear = new Date().getFullYear();
  const yearColorMap = new Map<number, string>();
  // Sort years descending — newest gets brand, then graduated colors back
  const sortedYears = [...years].sort((a, b) => b - a);
  const palette = [
    CHART_COLORS.savings,    // bright green — current/most recent
    CHART_COLORS.pv,         // orange — previous
    CHART_COLORS.gridExport, // blue — older
    CHART_COLORS.muted,      // grey — oldest
  ];
  sortedYears.forEach((y, idx) => {
    // Current year always strongest color (savings)
    if (y === currentYear) {
      yearColorMap.set(y, CHART_COLORS.savings);
    } else {
      yearColorMap.set(y, palette[Math.min(idx, palette.length - 1)] ?? CHART_COLORS.muted);
    }
  });

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
          {years.map((year) => (
            <Bar
              key={year}
              dataKey={String(year)}
              name={year === currentYear ? `${year} (bieżący)` : String(year)}
              fill={yearColorMap.get(year) ?? CHART_COLORS.muted}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
