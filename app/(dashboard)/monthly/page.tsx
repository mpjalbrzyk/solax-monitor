import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { DateNav } from "@/components/dashboard/date-nav";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import {
  MonthlyBarChart,
  type MonthlyDayPoint,
} from "@/components/charts/monthly-bar-chart";
import { Sun, Wallet, TrendingUp, CalendarCheck } from "lucide-react";
import { getActiveInverter, getDailyAggregates } from "@/lib/data/queries";
import {
  todayWarsaw,
  shiftMonthString,
  firstOfMonth,
  lastOfMonth,
} from "@/lib/date";
import { formatKwh, formatMonthYear, formatPln, formatDateShort } from "@/lib/format";

export const metadata = { title: "Miesiąc" };
export const dynamic = "force-dynamic";

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const today = todayWarsaw();
  const currentMonth = today.slice(0, 7);
  const month = isValidYearMonth(params.month) ? params.month! : currentMonth;

  const inverter = await getActiveInverter();
  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Miesiąc" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  const fromDate = firstOfMonth(`${month}-01`);
  const toDate = lastOfMonth(`${month}-01`);
  const dailyRange = await getDailyAggregates(inverter.id, fromDate, toDate);

  // Build a row for every day of the month so the bar chart shows the full
  // month even if some days are missing data.
  const totalDaysInMonth = Number(toDate.slice(8));
  const byDate = new Map(dailyRange.map((d) => [d.date, d]));
  const data: MonthlyDayPoint[] = Array.from(
    { length: totalDaysInMonth },
    (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const date = `${month}-${day}`;
      const row = byDate.get(date);
      return {
        date,
        dayLabel: String(i + 1),
        yield_kwh: Number(row?.yield_kwh ?? 0),
        savings_pln: Number(row?.savings_pln ?? 0),
      };
    },
  );

  const totalYield = data.reduce((s, d) => s + d.yield_kwh, 0);
  const totalSavings = dailyRange.reduce(
    (s, d) =>
      s +
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0),
    0,
  );
  const daysWithData = dailyRange.length;
  const avgDaily = daysWithData > 0 ? totalYield / daysWithData : 0;
  const top3 = [...dailyRange]
    .sort(
      (a, b) =>
        Number(b.yield_kwh ?? 0) - Number(a.yield_kwh ?? 0),
    )
    .slice(0, 3);

  const prevMonth = shiftMonthString(month, -1);
  const nextMonth = shiftMonthString(month, +1);
  const canGoForward = nextMonth <= currentMonth;

  return (
    <>
      <DashboardHeader
        title={formatMonthYear(`${month}-01`)}
        recordedAt={null}
      />

      <DateNav
        basePath="/monthly"
        prevHref={`/monthly?month=${prevMonth}`}
        nextHref={canGoForward ? `/monthly?month=${nextMonth}` : null}
        current={formatMonthYear(`${month}-01`)}
        todayHref={`/monthly?month=${currentMonth}`}
        showToday={month !== currentMonth}
      />

      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Produkcja dzienna · {formatMonthYear(`${month}-01`)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart data={data} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label="Produkcja w miesiącu"
          value={formatKwh(totalYield)}
          sub={`${daysWithData} dni z danymi`}
          tone="pv"
        />
        <KpiTile
          icon={TrendingUp}
          label="Średnia dzienna"
          value={formatKwh(avgDaily)}
          sub="z dni z danymi"
          tone="pv"
        />
        <KpiTile
          icon={Wallet}
          label="Bilans finansowy"
          value={formatPln(totalSavings)}
          sub="oszczędności + eksport − pobór"
          tone="savings"
        />
        <KpiTile
          icon={CalendarCheck}
          label="Najlepszy dzień"
          value={
            top3[0]
              ? formatKwh(top3[0].yield_kwh)
              : "—"
          }
          sub={top3[0] ? formatDateShort(top3[0].date) : undefined}
          tone="pv"
        />
      </section>

      {top3.length > 0 && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Top dni produkcji
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 text-sm">
              {top3.map((d, idx) => (
                <li
                  key={d.date}
                  className="flex items-center justify-between gap-3 py-1"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="size-6 rounded-full bg-[var(--pv)]/15 text-[var(--pv-foreground)] text-xs font-medium flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{formatDateShort(d.date)}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatKwh(d.yield_kwh)}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function isValidYearMonth(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}
