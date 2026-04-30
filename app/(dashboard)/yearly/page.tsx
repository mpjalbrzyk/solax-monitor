import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import {
  YearlyGroupedChart,
  type YearlyMonthPoint,
} from "@/components/charts/yearly-grouped-chart";
import { Sun, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { getActiveInverter, getMonthlyAggregates } from "@/lib/data/queries";
import { PL_MONTH_SHORT, todayWarsaw } from "@/lib/date";
import { formatKwh, formatMwh } from "@/lib/format";
import { GLOSSARY } from "@/lib/copy/glossary";

export const metadata = { title: "Rok do roku" };
export const dynamic = "force-dynamic";

export default async function YearlyPage() {
  const inverter = await getActiveInverter();
  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Rok do roku" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const monthly = await getMonthlyAggregates(inverter.id);

  // Group by year, then transpose into per-month rows for the grouped bar
  // chart: [{ monthIdx, monthLabel, "2025": 1234, "2026": 567 }, ...]
  const byYearMonth = new Map<string, number>(); // "YYYY-MM" -> kWh
  const yearsSet = new Set<number>();

  for (const m of monthly) {
    const ym = String(m.month).slice(0, 7);
    const yield_ = Number(m.pv_generation_kwh ?? 0);
    byYearMonth.set(ym, yield_);
    yearsSet.add(Number(ym.slice(0, 4)));
  }

  const years = Array.from(yearsSet).sort();

  const data: YearlyMonthPoint[] = Array.from({ length: 12 }, (_, idx) => {
    const monthIdx = idx + 1;
    const monthStr = String(monthIdx).padStart(2, "0");
    const row: YearlyMonthPoint = {
      monthIdx,
      monthLabel: PL_MONTH_SHORT[idx],
    };
    for (const year of years) {
      row[String(year)] = byYearMonth.get(`${year}-${monthStr}`) ?? 0;
    }
    return row;
  });

  // KPIs: total per year, best month overall, current year so far,
  // year-over-year delta vs same months last year.
  const totalPerYear = new Map<number, number>();
  for (const [ym, kwh] of byYearMonth) {
    const y = Number(ym.slice(0, 4));
    totalPerYear.set(y, (totalPerYear.get(y) ?? 0) + kwh);
  }

  const todayYear = Number(todayWarsaw().slice(0, 4));
  const todayMonth = Number(todayWarsaw().slice(5, 7));
  const previousYear = todayYear - 1;
  const currentYearTotal = totalPerYear.get(todayYear) ?? 0;
  const previousYearTotal = totalPerYear.get(previousYear) ?? 0;

  // Same-period comparison (jan..currentMonth) for each year
  let currentYearSamePeriod = 0;
  let previousYearSamePeriod = 0;
  for (let i = 1; i <= todayMonth; i++) {
    const mm = String(i).padStart(2, "0");
    currentYearSamePeriod += byYearMonth.get(`${todayYear}-${mm}`) ?? 0;
    previousYearSamePeriod += byYearMonth.get(`${previousYear}-${mm}`) ?? 0;
  }
  const yoyDelta =
    previousYearSamePeriod > 0
      ? ((currentYearSamePeriod - previousYearSamePeriod) /
          previousYearSamePeriod) *
        100
      : null;

  // Best month overall across all years.
  let bestMonth: { ym: string; kwh: number } | null = null;
  for (const [ym, kwh] of byYearMonth) {
    if (!bestMonth || kwh > bestMonth.kwh) bestMonth = { ym, kwh };
  }

  // Total lifetime in monthly_aggregates (note: only what backfill captured,
  // typically last ~13 months — see 08-phase-status Phase 2).
  const totalLifetime = Array.from(totalPerYear.values()).reduce(
    (s, v) => s + v,
    0,
  );

  return (
    <>
      <DashboardHeader title="Rok do roku" recordedAt={null} />

      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Produkcja miesięczna · porównanie lat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyGroupedChart data={data} years={years} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label={`Bieżący rok (${todayYear})`}
          value={formatKwh(currentYearTotal, 1)}
          sub={`Do końca ${PL_MONTH_SHORT[todayMonth - 1].toLowerCase()}`}
          tone="pv"
          hint={GLOSSARY.produkcjaLifetime}
        />
        <KpiTile
          icon={Calendar}
          label={`Poprzedni rok (${previousYear})`}
          value={formatKwh(previousYearTotal, 1)}
          sub={
            previousYearTotal > 0
              ? "całość roku"
              : "brak danych w bazie"
          }
          tone="export"
          hint={GLOSSARY.produkcjaLifetime}
        />
        <KpiTile
          icon={TrendingUp}
          label="YoY (ten sam okres)"
          value={
            yoyDelta != null
              ? `${yoyDelta >= 0 ? "+" : ""}${yoyDelta.toFixed(0)}%`
              : "—"
          }
          sub={
            yoyDelta != null
              ? `${formatKwh(currentYearSamePeriod, 1)} vs ${formatKwh(previousYearSamePeriod, 1)}`
              : "brak roku odniesienia"
          }
          tone={yoyDelta != null && yoyDelta >= 0 ? "savings" : "import"}
          hint={GLOSSARY.yoyPorownanie}
        />
        <KpiTile
          icon={Sparkles}
          label="Najlepszy miesiąc"
          value={bestMonth ? formatKwh(bestMonth.kwh, 1) : "—"}
          sub={bestMonth ? formatYM(bestMonth.ym) : undefined}
          tone="pv"
          hint={GLOSSARY.najlepszyMiesiac}
        />
      </section>

      <Card className="glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">
            Sumaryczna produkcja w bazie
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            backfill 13 mies. + bieżące dane
          </span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">
            {formatMwh(totalLifetime)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pełna produkcja od montażu (luty 2023) jest większa — Solax API
            udostępnia max ~12-13 miesięcy wstecz, reszta widoczna jako
            lifetime na liczniku falownika.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function formatYM(ym: string): string {
  const [y, m] = ym.split("-");
  const monthName = PL_MONTH_SHORT[Number(m) - 1] ?? m;
  return `${monthName} ${y}`;
}
