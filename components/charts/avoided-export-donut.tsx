"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, GlassTooltip, chartTickPln } from "./recharts-base";

// "Avoided Costs" vs "Export Revenues" — kategoryczne rozróżnienie z research:
//   1. Avoided Costs = energia ze słońca skonsumowana natychmiast = pieniądze
//      które nie opuściły konta bankowego (autokonsumpcja × cena PGE)
//   2. Export Revenues = nadwyżki wysłane do sieci, księgowane w depozycie
//      prosumenckim (eksport × RCEm/RCE z mnożnikiem)
//
// Visual: ciemna zieleń (autokonsumpcja, większy udział) + jasna zieleń
// (eksport). Donut z hole na centralny total.

export function AvoidedExportDonut({
  avoidedPln,
  exportPln,
  size = 180,
}: {
  avoidedPln: number;
  exportPln: number;
  size?: number;
}) {
  const total = avoidedPln + exportPln;
  if (total <= 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
        Brak danych do podziału.
      </div>
    );
  }

  const data = [
    {
      name: "Autokonsumpcja",
      value: avoidedPln,
      color: CHART_COLORS.savings,
    },
    {
      name: "Eksport (RCEm)",
      value: exportPln,
      color: CHART_COLORS.gridExport,
    },
  ];

  return (
    <div className="relative" style={{ width: "100%", height: size + 40 }}>
      <ResponsiveContainer width="100%" height={size}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={size * 0.32}
            outerRadius={size * 0.45}
            paddingAngle={2}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            content={
              <GlassTooltip
                formatter={(v) => chartTickPln(Number(v ?? 0))}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label inside donut hole */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ height: size }}
      >
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Razem
        </span>
        <span className="text-xl font-semibold tabular-nums">
          {chartTickPln(total)}
        </span>
      </div>

      {/* Legend below */}
      <div className="flex items-center justify-around gap-3 text-xs mt-2">
        {data.map((entry) => {
          const pct = (entry.value / total) * 100;
          return (
            <div key={entry.name} className="flex flex-col items-center min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground truncate">{entry.name}</span>
              </div>
              <span className="font-semibold tabular-nums text-[11px]">
                {chartTickPln(entry.value)} ({pct.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
