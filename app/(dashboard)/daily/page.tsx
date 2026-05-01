import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { DateNav } from "@/components/dashboard/date-nav";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import {
  DailyLineChart,
  type DailyChartPoint,
} from "@/components/charts/daily-line-chart";
import { Sun, Zap, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import {
  getActiveInverter,
  getDailyAggregates,
  getDeviceReadingsRange,
} from "@/lib/data/queries";
import {
  todayWarsaw,
  shiftDateString,
  warsawDayBoundsIso,
  warsawHourLabel,
} from "@/lib/date";
import { formatDateLong, formatKwh, formatPln, formatPower } from "@/lib/format";
import { GLOSSARY } from "@/lib/copy/glossary";

export const metadata = { title: "Dziś" };
export const dynamic = "force-dynamic";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = todayWarsaw();
  const date = isValidDate(params.date) ? params.date! : today;

  const inverter = await getActiveInverter();

  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Dziś" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const { fromIso, toIso } = warsawDayBoundsIso(date);

  const [inverterReadings, batteryReadings, todayAggArr] = await Promise.all([
    getDeviceReadingsRange(inverter.id, 1, fromIso, toIso),
    getDeviceReadingsRange(inverter.id, 2, fromIso, toIso),
    getDailyAggregates(inverter.id, date, date),
  ]);

  const dailyAgg = todayAggArr[0] ?? null;

  // Stitch inverter + battery samples by recorded_at (5-min cadence,
  // typically same timestamps). Battery may be empty (scenario A).
  const batteryByTs = new Map(
    batteryReadings.map((r) => [
      r.recorded_at,
      Number(r.charge_discharge_power_w ?? 0),
    ]),
  );

  const chartData: DailyChartPoint[] = inverterReadings.map((r) => {
    const pv_w = Math.max(Number(r.total_active_power_w ?? 0), 0);
    const grid_w = Number(r.grid_power_w ?? 0);
    const battery_w = batteryByTs.get(r.recorded_at) ?? 0;
    const load_w = Math.max(pv_w + battery_w - grid_w, 0);
    return {
      ts: r.recorded_at,
      hourLabel: warsawHourLabel(r.recorded_at),
      pv_w,
      load_w,
      grid_w,
    };
  });

  const peakProductionW =
    dailyAgg?.peak_production_w ??
    Math.max(...chartData.map((p) => p.pv_w), 0);

  const isToday = date === today;
  const prevDate = shiftDateString(date, -1);
  const nextDate = shiftDateString(date, +1);
  const canGoForward = nextDate <= today;

  return (
    <>
      <DashboardHeader
        title={`${formatDateLong(date)}`}
        recordedAt={
          inverterReadings.length > 0
            ? inverterReadings[inverterReadings.length - 1].recorded_at
            : null
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <DateNav
          basePath="/daily"
          prevHref={`/daily?date=${prevDate}`}
          nextHref={canGoForward ? `/daily?date=${nextDate}` : null}
          current={formatDateLong(date)}
        />
        {!isToday && (
          <a
            href={`/daily?date=${today}`}
            className="text-xs px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-foreground"
          >
            Dziś
          </a>
        )}
        <a
          href={`/daily?date=${shiftDateString(today, -1)}`}
          className="text-xs px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-muted-foreground hover:text-foreground"
        >
          Wczoraj
        </a>
        <a
          href={`/daily?date=${shiftDateString(today, -7)}`}
          className="text-xs px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-muted-foreground hover:text-foreground"
        >
          Tydzień temu
        </a>
        <a
          href={`/daily?date=${shiftDateString(today, -30)}`}
          className="text-xs px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-muted-foreground hover:text-foreground"
        >
          Miesiąc temu
        </a>
      </div>

      {/* === Bilans dnia HERO (audit C.3 — najważniejsza liczba pierwsza) === */}
      {dailyAgg?.savings_pln != null && (
        <Card className="glass-strong mb-4">
          <CardContent className="px-5 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  Bilans dnia
                </div>
                <div className="text-4xl sm:text-5xl font-semibold tabular-nums leading-none">
                  {formatPln(
                    Number(dailyAgg.savings_pln ?? 0) +
                      Number(dailyAgg.earnings_pln ?? 0) -
                      Number(dailyAgg.cost_pln ?? 0),
                    true,
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                Oszczędności z autokonsumpcji + przychód z eksportu − koszt poboru
              </div>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85 border-t border-zinc-200/40 pt-3">
              {buildDailyComment({
                dailyAgg,
                peakProductionW,
                isToday,
              })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Produkcja vs zużycie · {formatDateLong(date)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyLineChart data={chartData} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label="Produkcja"
          value={formatKwh(dailyAgg?.yield_kwh)}
          sub={`Szczyt ${formatPower(peakProductionW)}`}
          tone="pv"
          hint={GLOSSARY.produkcjaTeraz}
        />
        <KpiTile
          icon={Zap}
          label="Zużycie domu"
          value={formatKwh(dailyAgg?.consumption_kwh)}
          sub={
            dailyAgg?.self_use_rate_pct != null
              ? `Autokonsumpcja ${dailyAgg.self_use_rate_pct.toFixed(0)}%`
              : undefined
          }
          tone="export"
          hint={GLOSSARY.autokonsumpcja}
        />
        <KpiTile
          icon={ArrowDownToLine}
          label="Pobór z sieci"
          value={formatKwh(dailyAgg?.import_kwh)}
          sub={
            dailyAgg?.cost_pln != null
              ? `Koszt ${formatPln(dailyAgg.cost_pln, true)}`
              : undefined
          }
          tone="import"
          hint={GLOSSARY.importPobor}
        />
        <KpiTile
          icon={ArrowUpFromLine}
          label="Eksport do sieci"
          value={formatKwh(dailyAgg?.export_kwh)}
          sub={
            dailyAgg?.earnings_pln != null
              ? `Przychód ${formatPln(dailyAgg.earnings_pln, true)}`
              : undefined
          }
          tone="export"
          hint={GLOSSARY.eksport}
        />
      </section>

    </>
  );
}

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function buildDailyComment(args: {
  dailyAgg: import("@/lib/data/types").DailyAggregate;
  peakProductionW: number;
  isToday: boolean;
}): string {
  const { dailyAgg, peakProductionW, isToday } = args;
  const yieldKwh = Number(dailyAgg.yield_kwh ?? 0);
  const consumption = Number(dailyAgg.consumption_kwh ?? 0);
  const exportKwh = Number(dailyAgg.export_kwh ?? 0);
  const importKwh = Number(dailyAgg.import_kwh ?? 0);
  const netPln =
    Number(dailyAgg.savings_pln ?? 0) +
    Number(dailyAgg.earnings_pln ?? 0) -
    Number(dailyAgg.cost_pln ?? 0);

  const lines: string[] = [];

  if (yieldKwh < 0.5) {
    lines.push("Pochmurny dzień — panele prawie nic nie wyprodukowały.");
  } else if (yieldKwh < 10) {
    lines.push(`Słaby dzień — produkcja ${formatKwh(yieldKwh)}, daleko od potencjału instalacji.`);
  } else if (yieldKwh < 25) {
    lines.push(`Umiarkowana produkcja ${formatKwh(yieldKwh)}.`);
  } else {
    lines.push(`Mocny dzień — ${formatKwh(yieldKwh)} produkcji, szczyt ${formatPower(peakProductionW)}.`);
  }

  if (exportKwh > consumption) {
    lines.push(`Wyeksportowano do sieci ${formatKwh(exportKwh)} — więcej niż dom zużył (${formatKwh(consumption)}).`);
  } else if (importKwh > exportKwh && yieldKwh < consumption) {
    lines.push(`Dom potrzebował więcej niż panele dały — pobór z sieci ${formatKwh(importKwh)}.`);
  }

  if (Math.abs(netPln) > 1) {
    if (netPln > 0) {
      lines.push(`Bilans dnia: +${formatPln(netPln, true)}.`);
    } else {
      lines.push(`Bilans dnia: ${formatPln(netPln, true)}.`);
    }
  }

  if (isToday) {
    lines.push("Dane się jeszcze rozliczają — pełny bilans dnia będzie po północy.");
  }

  return lines.join(" ");
}
