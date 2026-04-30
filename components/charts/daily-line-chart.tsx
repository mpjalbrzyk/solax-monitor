"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, GlassTooltip, chartTickKw } from "./recharts-base";

export type DailyChartPoint = {
  ts: string; // ISO timestamp
  hourLabel: string; // "12:00" formatted in Europe/Warsaw
  pv_w: number;
  load_w: number;
  grid_w: number; // signed: + export, - import
};

export function DailyLineChart({ data }: { data: DailyChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych dla tego dnia.
      </div>
    );
  }

  return (
    <div className="h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.pv} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.pv} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.load} stopOpacity={0.2} />
              <stop offset="100%" stopColor={CHART_COLORS.load} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0 0)" vertical={false} />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tickFormatter={chartTickKw}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            content={
              <GlassTooltip
                formatter={(v: number | undefined) => chartTickKw(Number(v ?? 0))}
                labelFormatter={(l) => `Godzina ${l}`}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="pv_w"
            name="Produkcja"
            stroke={CHART_COLORS.pv}
            strokeWidth={2}
            fill="url(#pvGradient)"
          />
          <Area
            type="monotone"
            dataKey="load_w"
            name="Zużycie"
            stroke={CHART_COLORS.load}
            strokeWidth={1.5}
            fill="url(#loadGradient)"
          />
          <Line
            type="monotone"
            dataKey="grid_w"
            name="Bilans z siecią"
            stroke={CHART_COLORS.gridExport}
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
