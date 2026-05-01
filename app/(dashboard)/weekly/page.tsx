import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { DateNav } from "@/components/dashboard/date-nav";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { Sun, Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import {
  MonthlyBarChart,
  type MonthlyDayPoint,
} from "@/components/charts/monthly-bar-chart";
import {
  getActiveInverter,
  getDailyAggregates,
} from "@/lib/data/queries";
import { todayWarsaw, shiftDateString } from "@/lib/date";
import { formatKwh, formatPln } from "@/lib/format";
import { GLOSSARY } from "@/lib/copy/glossary";
import { narrateWeek } from "@/lib/derive/period-narrator";
import { PeriodNarrative } from "@/components/dashboard/period-narrative";

export const metadata = { title: "Tydzień" };
export const dynamic = "force-dynamic";

// Monday of the ISO week containing this date (Europe/Warsaw).
// Treats Monday as week start (Polish convention).
function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  dt.setUTCDate(dt.getUTCDate() + diff);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const PL_DAY_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function dayLabelFor(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayIdx = dt.getUTCDay(); // 0=Sun
  const polishIdx = dayIdx === 0 ? 6 : dayIdx - 1;
  return PL_DAY_SHORT[polishIdx];
}

function formatWeekLabel(monday: string): string {
  const sunday = shiftDateString(monday, 6);
  const [, mMon, dMon] = monday.split("-");
  const [, mSun, dSun] = sunday.split("-");
  if (mMon === mSun) return `${Number(dMon)}–${Number(dSun)}.${mMon}`;
  return `${Number(dMon)}.${mMon} – ${Number(dSun)}.${mSun}`;
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const today = todayWarsaw();
  const todayMonday = mondayOf(today);
  const weekStart = isValidDate(params.week) ? mondayOf(params.week!) : todayMonday;
  const weekEnd = shiftDateString(weekStart, 6);

  const inverter = await getActiveInverter();
  if (!inverter) {
    return (
      <>
        <DashboardHeader title="Tydzień" recordedAt={null} />
        <Card className="glass">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Brak instalacji w bazie.
          </CardContent>
        </Card>
      </>
    );
  }

  // Pobierz tydzień + tydzień poprzedni dla porównania
  const prevWeekStart = shiftDateString(weekStart, -7);
  const prevWeekEnd = shiftDateString(weekStart, -1);

  const [thisWeek, prevWeek] = await Promise.all([
    getDailyAggregates(inverter.id, weekStart, weekEnd),
    getDailyAggregates(inverter.id, prevWeekStart, prevWeekEnd),
  ]);

  const totalYield = thisWeek.reduce(
    (s, d) => s + Number(d.yield_kwh ?? 0),
    0,
  );
  const totalCost = thisWeek.reduce((s, d) => s + Number(d.cost_pln ?? 0), 0);
  const totalRevenue = thisWeek.reduce(
    (s, d) =>
      s + Number(d.savings_pln ?? 0) + Number(d.earnings_pln ?? 0),
    0,
  );
  const totalBalance = thisWeek.reduce(
    (s, d) =>
      s +
      Number(d.savings_pln ?? 0) +
      Number(d.earnings_pln ?? 0) -
      Number(d.cost_pln ?? 0),
    0,
  );
  const totalConsumption = thisWeek.reduce(
    (s, d) => s + Number(d.consumption_kwh ?? 0),
    0,
  );
  const totalImport = thisWeek.reduce(
    (s, d) => s + Number(d.import_kwh ?? 0),
    0,
  );
  const totalExport = thisWeek.reduce(
    (s, d) => s + Number(d.export_kwh ?? 0),
    0,
  );
  const daysWithData = thisWeek.filter((d) => Number(d.yield_kwh ?? 0) > 0).length;

  const bestDay = thisWeek.reduce<{ kwh: number; date: string | null }>(
    (acc, d) => {
      const k = Number(d.yield_kwh ?? 0);
      if (k > acc.kwh) return { kwh: k, date: d.date };
      return acc;
    },
    { kwh: 0, date: null },
  );

  const prevWeekYield = prevWeek.reduce(
    (s, d) => s + Number(d.yield_kwh ?? 0),
    0,
  );

  // Build chart data — 7 dni z labelami Pn-Nd
  const byDate = new Map(thisWeek.map((d) => [d.date, d]));
  const chartData: MonthlyDayPoint[] = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDateString(weekStart, i);
    const row = byDate.get(date);
    return {
      date,
      dayLabel: PL_DAY_SHORT[i],
      yield_kwh: Number(row?.yield_kwh ?? 0),
      savings_pln:
        Number(row?.savings_pln ?? 0) +
        Number(row?.earnings_pln ?? 0) -
        Number(row?.cost_pln ?? 0),
    };
  });

  const isCurrentWeek = weekStart === todayMonday;
  const prevHref = `/weekly?week=${shiftDateString(weekStart, -7)}`;
  const nextWeek = shiftDateString(weekStart, 7);
  const canGoForward = nextWeek <= todayMonday;
  const nextHref = canGoForward ? `/weekly?week=${nextWeek}` : null;

  const narration = narrateWeek({
    weekStart,
    weekEnd,
    yieldKwh: totalYield,
    savingsPln: totalRevenue,
    costPln: totalCost,
    balancePln: totalBalance,
    daysWithData,
    bestDayKwh: bestDay.kwh > 0 ? bestDay.kwh : null,
    bestDayDate: bestDay.date,
    prevWeekYieldKwh: prevWeekYield > 0 ? prevWeekYield : null,
  });

  const weekLabel = formatWeekLabel(weekStart);

  return (
    <>
      <DashboardHeader title={`Tydzień ${weekLabel}`} recordedAt={null} />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <DateNav
          basePath="/weekly"
          prevHref={prevHref}
          nextHref={nextHref}
          current={weekLabel}
        />
        {!isCurrentWeek && (
          <a
            href={`/weekly?week=${todayMonday}`}
            className="text-xs px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-foreground"
          >
            Bieżący tydzień
          </a>
        )}
        <a
          href={`/weekly?week=${shiftDateString(weekStart, -7)}`}
          className="text-xs px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-muted-foreground hover:text-foreground"
        >
          Tydzień temu
        </a>
      </div>

      {/* Bilans HERO */}
      <Card className="glass-strong mb-4">
        <CardContent className="px-5 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                Bilans tygodnia
              </div>
              <div className="text-4xl sm:text-5xl font-semibold tabular-nums leading-none">
                {formatPln(totalBalance, true)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground sm:text-right">
              Oszczędność z autokonsumpcji + przychód z eksportu − koszt poboru
              <br />
              {daysWithData}/7 dni z danymi
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrator */}
      <PeriodNarrative narration={narration} className="mb-4" />

      {/* Chart 7-dniowy */}
      <Card className="glass mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Produkcja dzienna · tydzień {weekLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart data={chartData} />
        </CardContent>
      </Card>

      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiTile
          icon={Sun}
          label="Produkcja"
          value={formatKwh(totalYield)}
          sub={
            daysWithData > 0
              ? `Śr. ${formatKwh(totalYield / 7, 1)}/dzień`
              : "brak danych"
          }
          tone="pv"
          hint={GLOSSARY.produkcjaLifetime}
        />
        <KpiTile
          icon={Wallet}
          label="Zużycie domu"
          value={formatKwh(totalConsumption)}
          sub={
            daysWithData > 0
              ? `Śr. ${formatKwh(totalConsumption / 7, 1)}/dzień`
              : undefined
          }
          tone="export"
          hint={GLOSSARY.autokonsumpcja}
        />
        <KpiTile
          icon={ArrowDownToLine}
          label="Pobór z sieci"
          value={formatKwh(totalImport)}
          sub={
            totalCost > 0 ? `Koszt ${formatPln(totalCost, true)}` : undefined
          }
          tone="import"
          hint={GLOSSARY.importPobor}
        />
        <KpiTile
          icon={ArrowUpFromLine}
          label="Eksport do sieci"
          value={formatKwh(totalExport)}
          sub={
            totalRevenue > 0
              ? `Przychód ${formatPln(totalRevenue, true)}`
              : undefined
          }
          tone="export"
          hint={GLOSSARY.eksport}
        />
      </section>

      {/* Day-by-day list (best/worst at glance) */}
      {daysWithData > 0 && (
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Po dniu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-center">
              {chartData.map((d, idx) => {
                const isBest = bestDay.date === d.date && d.yield_kwh > 0;
                const isToday = d.date === today;
                return (
                  <a
                    key={d.date}
                    href={`/daily?date=${d.date}`}
                    className={`group rounded-xl border px-2 py-3 transition-all ${
                      isBest
                        ? "border-[var(--solar-300)] bg-[var(--solar-100)] shadow-[0_0_16px_-4px_var(--solar-glow)]"
                        : isToday
                          ? "border-[var(--brand-300)] bg-[var(--brand-50)]"
                          : "border-zinc-200/60 bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
                      {PL_DAY_SHORT[idx]}
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular-nums mb-1">
                      {Number(d.date.slice(8))}
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                      {d.yield_kwh > 0 ? formatKwh(d.yield_kwh, 1) : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums mt-1">
                      {d.savings_pln != null && Math.abs(d.savings_pln) > 0.5
                        ? formatPln(d.savings_pln, true)
                        : ""}
                    </div>
                  </a>
                );
              })}
            </div>
            {bestDay.date && (
              <p className="text-xs text-muted-foreground mt-3">
                Klik w dzień → szczegóły w zakładce Dziś.
                {dayLabelFor(bestDay.date)} ({Number(bestDay.date.slice(8))}.
                {bestDay.date.slice(5, 7)}) najmocniejszy w tym tygodniu.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
