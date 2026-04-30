"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GlassTooltip, chartTickKwh } from "./recharts-base";

export type MonthlyDayPoint = {
  date: string; // ISO YYYY-MM-DD
  dayLabel: string; // "1", "15", "30"
  yield_kwh: number;
  savings_pln: number;
};

export function MonthlyBarChart({ data }: { data: MonthlyDayPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych dla tego miesiąca.
      </div>
    );
  }

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
            dataKey="dayLabel"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
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
                formatter={(v: number | undefined, name: string | undefined) => {
                  const num = Number(v ?? 0);
                  return name === "Produkcja"
                    ? chartTickKwh(num)
                    : `${new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(num)} zł`;
                }}
                labelFormatter={(l) => `Dzień ${l}`}
              />
            }
            cursor={{ fill: "oklch(0.95 0 0 / 0.6)" }}
          />
          <Bar
            dataKey="yield_kwh"
            name="Produkcja"
            fill={CHART_COLORS.pv}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
